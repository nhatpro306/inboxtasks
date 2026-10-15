import type { IncomingMessage, ServerResponse } from "node:http";
import { buildApp } from "@inboxtasks/api";

let ready: Promise<Awaited<ReturnType<typeof buildApp>>> | null = null;

function getApp() {
  if (!ready)
    ready = buildApp()
      .then(async (app) => {
        await app.ready();
        return app;
      })
      .catch((err) => {
        ready = null;
        throw err;
      });
  return ready;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const app = await getApp();
    app.server.emit("request", req, res);
  } catch (err) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        error: "api_initialization_failed",
        message: (err as Error).message,
      }),
    );
  }
}

export const config = { api: { bodyParser: false } };
