// DB1-DB2.ts
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
  const startTime = Date.now();
  const localTime = new Date().toLocaleString("id-ID", { 
    timeZone: "Asia/Jakarta",
    dateStyle: "short",
    timeStyle: "medium"
  });
  
  console.log(`[${new Date().toISOString()}] 🔄 Starting syncFilteredBooks at ${localTime} WIB`);
  
  try {
    // 1. Fetch from DB1
    const { data: books, error: errorDb1 } = await db1
      .from("books_nonfiction")
      .select("id, title, author");
    
    if (errorDb1) throw new Error(`DB1 Fetch Error: ${errorDb1.message}`);
    if (!books?.length) {
      console.log("No books found in source database");
      return "No books to sync.";
    }
    
    console.log(`Found ${books.length} total books in DB1`);
    
    // 2. Fetch existing IDs from DB2
    const { data: existing, error: errorDb2Fetch } = await db2
      .from("filtered_books")
      .select("id");
    
    if (errorDb2Fetch) throw new Error(`DB2 Fetch Error: ${errorDb2Fetch.message}`);
    
    const existingIds = new Set((existing ?? []).map((b) => b.id));
    console.log(`Found ${existingIds.size} existing books in DB2`);
    
    // 3. Filter only new entries
    const newBooks = books.filter((b) => !existingIds.has(b.id));
    if (!newBooks.length) {
      console.log("All books are already synced");
      return "No new books to insert.";
    }
    
    console.log(`Found ${newBooks.length} new books to sync`);
    
    // 4. Insert to DB2
    const { error: errorDb2Insert } = await db2
      .from("filtered_books")
      .insert(newBooks);
    
    if (errorDb2Insert) throw new Error(`DB2 Insert Error: ${errorDb2Insert.message}`);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const successMessage = `✅ Synced ${newBooks.length} books to DB2 in ${duration}s`;
    console.log(successMessage);
    return successMessage;
    
  } catch (err: any) {
    console.error(`[${new Date().toISOString()}] ❌ syncFilteredBooks failed:`, err);
    return `❌ Error: ${err.message}`;
  }
}

// === HTTP HANDLER (Optional for manual triggers) ===
// Only start if running directly (not when imported by cron.ts)
if (import.meta.main) {
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
    const localTime = new Date().toLocaleString("id-ID", { 
      timeZone: "Asia/Jakarta",
      dateStyle: "short",
      timeStyle: "medium"
    });
    
    return new Response(`
      Available endpoints:
      - GET /sync - Manually trigger sync
      - GET /health - Health check
      
      Current time: ${localTime} WIB
      Automatic sync runs daily at 16:30 WIB (Indonesian Western Time)
      Next sync: ${getNextSyncTime()}
    `, { 
      status: 200,
      headers: { "Content-Type": "text/plain" }
    });
  });
}

// Helper function to calculate next sync time
function getNextSyncTime(): string {
  const now = new Date();
  const next = new Date();
  
  // Set to 16:30 Jakarta time
  next.setUTCHours(9, 30, 0, 0); // 09:30 UTC = 16:30 WIB
  
  // If we've already passed today's sync time, move to tomorrow
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  
  return next.toLocaleString("id-ID", { 
    timeZone: "Asia/Jakarta",
    dateStyle: "short",
    timeStyle: "medium"
  });
}

// === LOCAL DEV MODE ===
// Run once if LOCAL_RUN=true (for testing locally)
if (!Deno.env.get("DENO_DEPLOYMENT_ID") && Deno.env.get("LOCAL_RUN") === "true") {
  try {
    const result = await syncFilteredBooks();
    console.log(result);
    Deno.exit(0);
  } catch (error: any) {
    console.error("Local run failed:", error);
    Deno.exit(1);
  }
}