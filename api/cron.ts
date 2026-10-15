import type { IncomingMessage, ServerResponse } from "node:http";
import { runCycle } from "@inboxtasks/pipeline";

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    res.statusCode = 401;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "unauthorized" }));
    return;
  }

  try {
    const startTime = Date.now();
    await runCycle();
    const durationMs = Date.now() - startTime;
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        ok: true,
        stats: {
          durationMs,
          timestamp: new Date().toISOString(),
        },
      }),
    );
  } catch (err) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ ok: false, error: (err as Error).message }));
  }
}

