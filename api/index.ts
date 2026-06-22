import type { IncomingMessage, ServerResponse } from "node:http";
import { buildApp } from "@inboxtasks/api";

let ready: Promise<Awaited<ReturnType<typeof buildApp>>> | null = null;

function getApp() {
  if (!ready)
    ready = buildApp().then(async (app) => {
      await app.ready();
      return app;
    });
  return ready;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const app = await getApp();
  app.server.emit("request", req, res);
}

export const config = { api: { bodyParser: false } };
