import { config } from "dotenv";
import { resolve } from "node:path";
import cron from "node-cron";
import { ensureUser } from "@inboxtasks/db";
import { ingestAllAccounts } from "./ingest.js";

config({ path: resolve(import.meta.dirname, "../../../.env") });

const intervalMinutes = Number(process.env.POLL_INTERVAL_MINUTES ?? 60);

async function main(): Promise<void> {
  await ensureUser();
  const expr = `*/${Math.max(1, Math.min(59, intervalMinutes))} * * * *`;
  console.log(`[worker] starting; polling every ${intervalMinutes} min (cron: ${expr})`);
  cron.schedule(expr, () => {
    void ingestAllAccounts();
  });
  // Run once at boot so a backlog (PC was off) is processed immediately.
  void ingestAllAccounts();
}

main().catch((err) => {
  console.error("[worker] fatal:", err);
  process.exit(1);
});
