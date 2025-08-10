// === IMPORT LIBRARIES ===
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "https://deno.land/std@0.168.0/dotenv/load.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// === DB1 CONFIG (source) ===
const db1 = createClient(
  Deno.env.get("DB1_URL") ?? "",
  Deno.env.get("DB1_SERVICE_ROLE_KEY") ?? ""
);

// === DB2 CONFIG (destination) ===
const db2 = createClient(
  Deno.env.get("DB2_URL") ?? "",
  Deno.env.get("DB2_SERVICE_ROLE_KEY") ?? ""
);

/**
 * Synchronizes nonfiction books from DB1 → DB2, skipping existing IDs.
 */
export async function syncFilteredBooks(): Promise<string> {
  console.log(`[${new Date().toISOString()}] 🔄 Starting syncFilteredBooks`);

  try {
    // 1. Fetch from DB1
    const { data: books, error: errorDb1 } = await db1
      .from("books_nonfiction")
      .select("id, title, author");

    if (errorDb1) throw new Error(`DB1 Fetch Error: ${errorDb1.message}`);
    if (!books || books.length === 0) {
      return "No books to sync.";
    }

    // 2. Fetch existing IDs from DB2
    const { data: existing, error: errorDb2Fetch } = await db2
      .from("filtered_books")
      .select("id");

    if (errorDb2Fetch) throw new Error(`DB2 Fetch Error: ${errorDb2Fetch.message}`);

    const existingIds = new Set((existing ?? []).map((b) => b.id));

    // 3. Filter only new entries
    const newBooks = books.filter((b) => !existingIds.has(b.id));
    if (newBooks.length === 0) {
      return "No new books to insert.";
    }

    // 4. Insert to DB2
    const { error: errorDb2Insert } = await db2
      .from("filtered_books")
      .insert(newBooks);

    if (errorDb2Insert) throw new Error(`DB2 Insert Error: ${errorDb2Insert.message}`);

    return `✅ Synced ${newBooks.length} books to DB2.`;
  } catch (err) {
    console.error(`[${new Date().toISOString()}] ❌ syncFilteredBooks failed:`, err);
    throw err;
  }
}

// === HTTP handler (needed for Deno Deploy warm-up & manual trigger) ===
serve(async (_req) => {
  try {
    const result = await syncFilteredBooks();
    return new Response(result, { status: 200 });
  } catch (err) {
    return new Response("❌ Error: " + err.message, { status: 500 });
  }
});

// === Allow direct execution locally ===
if (import.meta.main) {
  console.log(await syncFilteredBooks());
}
