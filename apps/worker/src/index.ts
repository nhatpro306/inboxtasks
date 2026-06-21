import { config } from "dotenv";
import { resolve } from "node:path";
import cron from "node-cron";
import { ensureUser } from "@inboxtasks/db";
import { runCycle } from "@inboxtasks/pipeline";

config({ path: resolve(import.meta.dirname, "../../../.env") });

const intervalMinutes = Number(process.env.POLL_INTERVAL_MINUTES ?? 60);

async function main(): Promise<void> {
  await ensureUser();
  const expr = `*/${Math.max(1, Math.min(59, intervalMinutes))} * * * *`;
  console.log(`[worker] starting; polling every ${intervalMinutes} min (cron: ${expr})`);
  cron.schedule(expr, () => {
    void runCycle();
  });
  void runCycle();
}

main().catch((err) => {
  console.error("[worker] fatal:", err);
  process.exit(1);
});
