// === IMPORT LIBRARIES ===
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// === LOAD .ENV FOR LOCAL ONLY ===
if (!Deno.env.get("DENO_DEPLOYMENT_ID")) {
  try {
    await import("https://deno.land/std@0.168.0/dotenv/load.ts");
    console.log("✅ .env loaded (local mode)");
  } catch {
    console.warn("⚠️ No .env file found (local mode)");
  }
}

// === ENVIRONMENT VALIDATION ===
function getEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

// === DB CONFIG ===
const db1 = createClient(getEnv("DB1_URL"), getEnv("DB1_SERVICE_ROLE_KEY"));
const db2 = createClient(getEnv("DB2_URL"), getEnv("DB2_SERVICE_ROLE_KEY"));

// === CORE SYNC FUNCTION ===
export async function syncFilteredBooks(): Promise<string> {
  console.log(`[${new Date().toISOString()}] 🔄 Starting syncFilteredBooks`);
  try {
    // Fetch from DB1
    const { data: books, error: errorDb1 } = await db1
      .from("books_nonfiction")
      .select("id, title, author");

    if (errorDb1) throw new Error(`DB1 Fetch Error: ${errorDb1.message}`);
    if (!books?.length) return "No books to sync.";

    // Fetch from DB2
    const { data: existing, error: errorDb2Fetch } = await db2
      .from("filtered_books")
      .select("id");

    if (errorDb2Fetch) throw new Error(`DB2 Fetch Error: ${errorDb2Fetch.message}`);

    // Determine new books
    const existingIds = new Set((existing ?? []).map((b) => b.id));
    const newBooks = books.filter((b) => !existingIds.has(b.id));
    if (!newBooks.length) return "No new books to insert.";

    // Insert new books
    const { error: errorDb2Insert } = await db2
      .from("filtered_books")
      .insert(newBooks);

    if (errorDb2Insert) throw new Error(`DB2 Insert Error: ${errorDb2Insert.message}`);

    return `✅ Synced ${newBooks.length} books to DB2.`;
  } catch (err) {
    console.error(`[${new Date().toISOString()}] ❌ syncFilteredBooks failed:`, err);
    return `❌ Error: ${err.message}`;
  }
}

// === HTTP SERVER (DEPLOY + LOCAL SERVER) ===
serve(async (req) => {
  const url = new URL(req.url);

  // Health check / warm-up — instant response
  if (url.pathname === "/") {
    return new Response("OK", { status: 200 });
  }

  // Trigger sync manually
  if (url.pathname === "/sync") {
    const result = await syncFilteredBooks();
    return new Response(result, { status: 200 });
  }

  // Not found
  return new Response("Not Found", { status: 404 });
});

// === LOCAL DEV: Auto-run sync if LOCAL_RUN=true ===
if (!Deno.env.get("DENO_DEPLOYMENT_ID") && Deno.env.get("LOCAL_RUN") === "true") {
  syncFilteredBooks().then(console.log);
}
