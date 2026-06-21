import { config } from "dotenv";
import { resolve } from "node:path";
import cron from "node-cron";

config({ path: resolve(import.meta.dirname, "../../../.env") });

const intervalMinutes = Number(process.env.POLL_INTERVAL_MINUTES ?? 60);

// Sprint 1 fills in IMAP poll + parse. Sprint 0: prove the cron loop boots.
async function poll(): Promise<void> {
  console.log(`[worker] poll tick @ ${new Date().toISOString()} (no-op until Sprint 1)`);
}

const expr = `*/${Math.max(1, intervalMinutes)} * * * *`;
console.log(`[worker] starting; polling every ${intervalMinutes} min (cron: ${expr})`);
cron.schedule(expr, () => {
  void poll();
});

void poll();
