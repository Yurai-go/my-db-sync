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
  const jakartaTime = new Date().toLocaleString("en-US", { 
    timeZone: "Asia/Jakarta",
    dateStyle: "short",
    timeStyle: "medium"
  });
  
  console.log(`[${new Date().toISOString()}] 🔄 Starting syncFilteredBooks at ${jakartaTime} WIB`);
  
  try {
    // 1. Fetch from DB1
    console.log("📖 Fetching books from DB1...");
    const { data: books, error: errorDb1 } = await db1
      .from("books_nonfiction")
      .select("id, title, author");
    
    if (errorDb1) throw new Error(`DB1 Fetch Error: ${errorDb1.message}`);
    if (!books?.length) {
      console.log("📚 No books found in DB1");
      return "No books to sync.";
    }
    
    console.log(`📚 Found ${books.length} books in DB1`);
    
    // 2. Fetch existing IDs from DB2
    console.log("🔍 Checking existing books in DB2...");
    const { data: existing, error: errorDb2Fetch } = await db2
      .from("filtered_books")
      .select("id");
    
    if (errorDb2Fetch) throw new Error(`DB2 Fetch Error: ${errorDb2Fetch.message}`);
    
    const existingIds = new Set((existing ?? []).map((b) => b.id));
    console.log(`🗃️ Found ${existingIds.size} existing books in DB2`);
    
    // 3. Filter only new entries
    const newBooks = books.filter((b) => !existingIds.has(b.id));
    if (!newBooks.length) {
      console.log("✨ No new books to insert - already up to date!");
      return "No new books to insert - already synchronized.";
    }
    
    console.log(`🆕 Found ${newBooks.length} new books to sync`);
    
    // 4. Insert to DB2
    console.log("💾 Inserting new books to DB2...");
    const { error: errorDb2Insert } = await db2
      .from("filtered_books")
      .insert(newBooks);
    
    if (errorDb2Insert) throw new Error(`DB2 Insert Error: ${errorDb2Insert.message}`);
    
    const successMessage = `✅ Successfully synced ${newBooks.length} new books to DB2.`;
    console.log(successMessage);
    return successMessage;
    
  } catch (err: any) {
    const errorMessage = `❌ syncFilteredBooks failed: ${err.message}`;
    console.error(`[${new Date().toISOString()}]`, errorMessage);
    return errorMessage;
  }
}

// === CRON HANDLER ===
// This function will be called by Deno Deploy's cron scheduler
export async function cronHandler() {
  const jakartaTime = new Date().toLocaleString("en-US", { 
    timeZone: "Asia/Jakarta",
    dateStyle: "short",
    timeStyle: "medium"
  });
  
  console.log(`[${new Date().toISOString()}] ⏰ Cron job triggered at ${jakartaTime} WIB`);
  
  try {
    const result = await syncFilteredBooks();
    console.log(`[${new Date().toISOString()}] 🎯 Cron job completed: ${result}`);
    return result;
  } catch (error: any) {
    const errorMsg = `🚨 Cron job failed: ${error.message}`;
    console.error(`[${new Date().toISOString()}]`, errorMsg);
    throw error; // Re-throw for Deno Deploy retry mechanism
  }
}

// === HTTP HANDLER ===
Deno.serve(async (req) => {
  const url = new URL(req.url);
  
  console.log(`[${new Date().toISOString()}] 🌐 HTTP Request: ${req.method} ${url.pathname}`);
  
  // Manual trigger endpoint
  if (url.pathname === "/sync") {
    try {
      const result = await syncFilteredBooks();
      return new Response(result, { 
        status: 200,
        headers: { 
          "Content-Type": "text/plain",
          "Access-Control-Allow-Origin": "*"
        }
      });
    } catch (error: any) {
      return new Response(`Error: ${error.message}`, { 
        status: 500,
        headers: { 
          "Content-Type": "text/plain",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
  }
  
  // Health check endpoint
  if (url.pathname === "/health") {
    const jakartaTime = new Date().toLocaleString("en-US", { 
      timeZone: "Asia/Jakarta",
      dateStyle: "full",
      timeStyle: "medium"
    });
    
    return new Response(`✅ Service is healthy!\n🕐 Current WIB time: ${jakartaTime}`, { 
      status: 200,
      headers: { 
        "Content-Type": "text/plain",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
  
  // Status endpoint
  if (url.pathname === "/status") {
    const jakartaTime = new Date().toLocaleString("en-US", { 
      timeZone: "Asia/Jakarta",
      dateStyle: "full",
      timeStyle: "medium"
    });
    
    const status = {
      service: "DB Sync Service",
      status: "running",
      currentTime: jakartaTime,
      timezone: "WIB (UTC+7)",
      nextSync: "Daily at 16:30 WIB",
      endpoints: ["/sync", "/health", "/status"]
    };
    
    return new Response(JSON.stringify(status, null, 2), { 
      status: 200,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
  
  // Default response
  return new Response(`
🔄 DB Sync Service

Available endpoints:
• GET /sync - Manually trigger sync
• GET /health - Health check  
• GET /status - Service status (JSON)

⏰ Automatic sync runs daily at 16:30 WIB (Indonesian Western Time)
🕐 Current WIB time: ${new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" })}

🚀 Service is running and ready!
  `, { 
    status: 200,
    headers: { 
      "Content-Type": "text/plain",
      "Access-Control-Allow-Origin": "*"
    }
  });
});

// === LOCAL DEV MODE ===
// Run once if LOCAL_RUN=true (for testing locally)
if (!Deno.env.get("DENO_DEPLOYMENT_ID") && Deno.env.get("LOCAL_RUN") === "true") {
  console.log("🧪 LOCAL_RUN mode detected - running sync once...");
  try {
    const result = await syncFilteredBooks();
    console.log("🧪 Local run result:", result);
    Deno.exit(0); // Exit after running once in local mode
  } catch (error: any) {
    console.error("🧪 Local run failed:", error);
    Deno.exit(1);
  }
}