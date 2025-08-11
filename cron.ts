// cron.ts - Deno Cron Scheduler for DB Sync
import { cronHandler, syncFilteredBooks } from "./DB1-DB2.ts";

console.log("🚀 Initializing Deno Cron Scheduler...");

// Get current time in WIB for logging
const jakartaTime = new Date().toLocaleString("en-US", { 
  timeZone: "Asia/Jakarta",
  dateStyle: "full",
  timeStyle: "medium"
});

console.log(`🕐 Service started at: ${jakartaTime} WIB`);
console.log(`⏰ Next sync scheduled: Daily at 16:30 WIB (09:30 UTC)`);

// === DENO CRON SCHEDULER ===
// Schedule: "30 9 * * *" -> every day at 09:30 UTC (16:30 WIB/Jakarta time)
// WIB (Western Indonesian Time) = UTC+7
// So 16:30 WIB = 09:30 UTC

Deno.cron(
  "daily-db-sync",
  "30 9 * * *", // 09:30 UTC = 16:30 WIB
  {
    // Retry configuration: 1s, 5s, 10s backoff
    backoffSchedule: [1000, 5000, 10000],
  },
  async () => {
    console.log("🔔 ============================================");
    console.log("🔔 DAILY CRON JOB TRIGGERED");
    console.log("🔔 ============================================");
    
    try {
      await cronHandler();
      console.log("🔔 ============================================");
      console.log("🔔 DAILY CRON JOB COMPLETED SUCCESSFULLY");
      console.log("🔔 ============================================");
    } catch (error) {
      console.error("🔔 ============================================");
      console.error("🔔 DAILY CRON JOB FAILED");
      console.error("🔔 ============================================");
      console.error("🔔 Error:", error);
      console.error("🔔 ============================================");
      
      // Re-throw to trigger Deno Deploy's retry mechanism
      throw error;
    }
  }
);

// === HTTP SERVER FOR MANUAL TESTING ===
// This allows manual triggers via HTTP endpoints
Deno.serve(async (req) => {
  const url = new URL(req.url);
  
  // Manual trigger endpoint
  if (url.pathname === "/trigger-sync") {
    console.log("🔧 Manual sync triggered via HTTP");
    try {
      const result = await syncFilteredBooks();
      return new Response(`Manual sync completed: ${result}`, { 
        status: 200,
        headers: { 
          "Content-Type": "text/plain",
          "Access-Control-Allow-Origin": "*"
        }
      });
    } catch (error: any) {
      return new Response(`Manual sync failed: ${error.message}`, { 
        status: 500,
        headers: { 
          "Content-Type": "text/plain",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
  }
  
  // Cron status endpoint
  if (url.pathname === "/cron-status") {
    const jakartaTime = new Date().toLocaleString("en-US", { 
      timeZone: "Asia/Jakarta",
      dateStyle: "full",
      timeStyle: "medium"
    });
    
    const status = {
      service: "Deno Cron Scheduler",
      status: "active",
      cronJob: "daily-db-sync",
      schedule: "30 9 * * * (09:30 UTC / 16:30 WIB)",
      currentTime: jakartaTime,
      timezone: "WIB (UTC+7)",
      nextRun: "Daily at 16:30 WIB",
      manualTrigger: "/trigger-sync"
    };
    
    return new Response(JSON.stringify(status, null, 2), { 
      status: 200,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
  
  // Health check
  if (url.pathname === "/health") {
    return new Response("Cron scheduler is running", { 
      status: 200,
      headers: { 
        "Content-Type": "text/plain",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
  
  // Default response
  return new Response(`
⏰ Deno Cron Scheduler - DB Sync Service

🔄 Automatic sync: Daily at 16:30 WIB (09:30 UTC)
🕐 Current WIB time: ${new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" })}

Available endpoints:
• GET /trigger-sync - Manually trigger sync
• GET /cron-status - Get cron job status (JSON)  
• GET /health - Health check

⚡ Cron job is active and running!
  `, { 
    status: 200,
    headers: { 
      "Content-Type": "text/plain",
      "Access-Control-Allow-Origin": "*"
    }
  });
});