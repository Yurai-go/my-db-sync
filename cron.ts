// cron.ts
import { syncFilteredBooks } from "./DB1-DB2.ts";

// schedule: 0 3 * * *  -> every day at 03:00 UTC
Deno.cron(
  "daily-db-sync",
  "0 3 * * *",
  {
    // optional retry backoff in milliseconds (1s, 5s, 10s)
    backoffSchedule: [1000, 5000, 10000],
  },
  async () => {
    console.log("daily-db-sync started", new Date().toISOString());
    try {
      await syncFilteredBooks();
      console.log("daily-db-sync finished", new Date().toISOString());
    } catch (err) {
      console.error("daily-db-sync failed", err);
      // rethrow so Deno Deploy registers failure and triggers retries (if any)
      throw err;
    }
  },
);
