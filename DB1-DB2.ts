// === IMPORT LIBRARIES ===
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Load .env only in local/dev mode (not in Deno Deploy)
if (!Deno.env.get("DENO_DEPLOYMENT_ID")) {
  try {
    await import("https://deno.land/std@0.168.0/dotenv/load.ts");
  } catch {
    // Silently ignore if dotenv fails (e.g., no .env file)
  }
}

// === DB1 CONFIG (source) ===
const db1Url = Deno.env.get("DB1_URL");
const db1Key = Deno.env.get("DB1_SERVICE_ROLE_KEY");

if (!db1Url || !db1Key) {
  console.error("Missing DB1 configuration");
  throw new Error("DB1_URL and DB1_SERVICE_ROLE_KEY must be set");
}

const db1 = createClient(db1Url, db1Key);

// === DB2 CONFIG (destination) ===
const db2Url = Deno.env.get("DB2_URL");
const db2Key = Deno.env.get("DB2_SERVICE_ROLE_KEY");

if (!db2Url || !db2Key) {
  console.error("Missing DB2 configuration");
  throw new Error("DB2_URL and DB2_SERVICE_ROLE_KEY must be set");
}

const db2 = createClient(db2Url, db2Key);

// === CORE SYNC FUNCTION ===
export async function syncFilteredBooks(): Promise<string> {
  console.log(`[${new Date().toISOString()}] 🔄 Starting syncFilteredBooks`);
  
  try {
    // 1. Fetch from DB1
    const { data: books, error: errorDb1 } = await db1
      .from("books_nonfiction")
      .select("id, title, author");
    
    if (errorDb1) throw new Error(`DB1 Fetch Error: ${errorDb1.message}`);
    if (!books?.length) return "No books to sync.";
    
    // 2. Fetch existing IDs from DB2
    const { data: existing, error: errorDb2Fetch } = await db2
      .from("filtered_books")
      .select("id");
    
    if (errorDb2Fetch) throw new Error(`DB2 Fetch Error: ${errorDb2Fetch.message}`);
    
    const existingIds = new Set((existing ?? []).map((b) => b.id));
    
    // 3. Filter only new entries
    const newBooks = books.filter((b) => !existingIds.has(b.id));
    if (!newBooks.length) return "No new books to insert.";
    
    // 4. Insert to DB2
    const { error: errorDb2Insert } = await db2
      .from("filtered_books")
      .insert(newBooks);
    
    if (errorDb2Insert) throw new Error(`DB2 Insert Error: ${errorDb2Insert.message}`);
    
    return `✅ Synced ${newBooks.length} books to DB2.`;
  } catch (err: any) {
    console.error(`[${new Date().toISOString()}] ❌ syncFilteredBooks failed:`, err);
    return `❌ Error: ${err.message}`;
  }
}

// === CRON HANDLER ===
// This function will be called by Deno Deploy's cron scheduler
export async function syncBooks() {
  console.log(`[${new Date().toISOString()}] ⏰ Cron job triggered`);
  const result = await syncFilteredBooks();
  console.log(`[${new Date().toISOString()}] Cron result: ${result}`);
  return result;
}

// === HTTP HANDLER ===
Deno.serve(async (req) => {
  const url = new URL(req.url);
  
  // Manual trigger endpoint
  if (url.pathname === "/sync") {
    try {
      const result = await syncFilteredBooks();
      return new Response(result, { 
        status: 200,
        headers: { "Content-Type": "text/plain" }
      });
    } catch (error: any) {
      return new Response(`Error: ${error.message}`, { 
        status: 500,
        headers: { "Content-Type": "text/plain" }
      });
    }
  }
  
  // Health check endpoint
  if (url.pathname === "/health") {
    return new Response("OK", { 
      status: 200,
      headers: { "Content-Type": "text/plain" }
    });
  }
  
  // Default response
  return new Response(`
    Available endpoints:
    - GET /sync - Manually trigger sync
    - GET /health - Health check
    
    Automatic sync runs daily at 16:10 WIB (Indonesian Western Time)
  `, { 
    status: 200,
    headers: { "Content-Type": "text/plain" }
  });
});

// === LOCAL DEV MODE ===
// Run once if LOCAL_RUN=true (for testing locally)
if (!Deno.env.get("DENO_DEPLOYMENT_ID") && Deno.env.get("LOCAL_RUN") === "true") {
  try {
    const result = await syncFilteredBooks();
    console.log(result);
  } catch (error: any) {
    console.error("Local run failed:", error);
  }
}