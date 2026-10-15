import { config } from "dotenv";
import { resolve } from "node:path";
import cron from "node-cron";
import { ensureUser } from "@inboxtasks/db";
import { runCycle } from "@inboxtasks/pipeline";

config({ path: resolve(import.meta.dirname, "../../../.env") });

const intervalMinutes = Number(process.env.POLL_INTERVAL_MINUTES ?? 60);

let isRunning = false;

async function main(): Promise<void> {
  await ensureUser();
  const expr = `*/${Math.max(1, Math.min(59, intervalMinutes))} * * * *`;
  console.log(`[worker] starting; polling every ${intervalMinutes} min (cron: ${expr})`);
  cron.schedule(expr, async () => {
    if (isRunning) {
      console.log(`[worker] previous cycle still active, skipping overlapping run`);
      return;
    }
    isRunning = true;
    try {
      await runCycle();
    } catch (err) {
      console.error("[worker] cycle error:", (err as Error).message);
    } finally {
      isRunning = false;
    }
  });
  void (async () => {
    if (isRunning) {
      console.log(`[worker] previous cycle still active, skipping overlapping run`);
      return;
    }
    isRunning = true;
    try {
      await runCycle();
    } catch (err) {
      console.error("[worker] cycle error:", (err as Error).message);
    } finally {
      isRunning = false;
    }
  })();
}

main().catch((err) => {
  console.error("[worker] fatal:", err);
  process.exit(1);
});
