import type { IncomingMessage, ServerResponse } from "node:http";
import { runCycle } from "@inboxtasks/pipeline";

export default async function handler(_req: IncomingMessage, res: ServerResponse) {
  try {
    await runCycle();
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true }));
  } catch (err) {
    res.statusCode = 500;
    res.end(JSON.stringify({ ok: false, error: (err as Error).message }));
  }
}
