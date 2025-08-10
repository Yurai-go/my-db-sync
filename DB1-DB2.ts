// === IMPORT LIBRARIES ===
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Load .env only in local/dev mode
if (!Deno.env.get("DENO_DEPLOYMENT_ID")) {
  // No await — prevents blocking startup
  import("https://deno.land/std@0.168.0/dotenv/load.ts")
    .catch(() => console.warn("No .env file found (local mode)"));
}

// === DB CONFIG ===
const db1 = createClient(
  Deno.env.get("DB1_URL") ?? "",
  Deno.env.get("DB1_SERVICE_ROLE_KEY") ?? ""
);

const db2 = createClient(
  Deno.env.get("DB2_URL") ?? "",
  Deno.env.get("DB2_SERVICE_ROLE_KEY") ?? ""
);

// === CORE SYNC FUNCTION ===
export async function syncFilteredBooks(): Promise<string> {
  console.log(`[${new Date().toISOString()}] 🔄 Starting syncFilteredBooks`);
  try {
    const { data: books, error: errorDb1 } = await db1
      .from("books_nonfiction")
      .select("id, title, author");

    if (errorDb1) throw new Error(`DB1 Fetch Error: ${errorDb1.message}`);
    if (!books?.length) return "No books to sync.";

    const { data: existing, error: errorDb2Fetch } = await db2
      .from("filtered_books")
      .select("id");

    if (errorDb2Fetch) throw new Error(`DB2 Fetch Error: ${errorDb2Fetch.message}`);

    const existingIds = new Set((existing ?? []).map((b) => b.id));
    const newBooks = books.filter((b) => !existingIds.has(b.id));
    if (!newBooks.length) return "No new books to insert.";

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

// === HTTP HANDLER ===
serve(async (_req) => {
  const result = await syncFilteredBooks();
  return new Response(result, { status: 200 });
});

// === LOCAL DEV MODE ===
if (!Deno.env.get("DENO_DEPLOYMENT_ID") && Deno.env.get("LOCAL_RUN") === "true") {
  syncFilteredBooks().then(console.log);
}
