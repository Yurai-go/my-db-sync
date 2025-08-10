// cron.ts
import { syncFilteredBooks } from "./DB1-DB2.ts";

// Schedule: "30 9 * * *" -> every day at 09:30 UTC (16:30 WIB/Jakarta time)
// WIB (Western Indonesian Time) = UTC+7
// So 16:30 WIB = 09:30 UTC

Deno.cron(
  "daily-db-sync",
  "30 9 * * *",  // Changed to 09:30 UTC which is 16:30 WIB
  {
    // optional retry backoff in milliseconds (1s, 5s, 10s)
    backoffSchedule: [1000, 5000, 10000],
  },
  async () => {
    const localTime = new Date().toLocaleString("id-ID", { 
      timeZone: "Asia/Jakarta",
      dateStyle: "short",
      timeStyle: "medium"
    });
    console.log(`[${new Date().toISOString()}] daily-db-sync started at ${localTime} WIB`);
    
    try {
      const result = await syncFilteredBooks();
      console.log(`[${new Date().toISOString()}] daily-db-sync finished: ${result}`);
    } catch (err) {
      console.error(`[${new Date().toISOString()}] daily-db-sync failed:`, err);
      // rethrow so Deno Deploy registers failure and triggers retries (if any)
      throw err;
    }
  },
);