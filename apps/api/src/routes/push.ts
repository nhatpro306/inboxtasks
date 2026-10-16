import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma, ensureUser } from "@inboxtasks/db";
import { updateMemorySettings } from "../lib/memoryStore.js";

export async function pushRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/push/vapid", async () => {
    return { public_key: process.env.VAPID_PUBLIC_KEY ?? "" };
  });

  app.post("/api/push/subscribe", async (req, reply) => {
    const bodySchema = z.object({
      endpoint: z.string().url(),
      keys: z.object({
        p256dh: z.string().min(1),
        auth: z.string().min(1),
      }),
    });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_failed", details: parsed.error.flatten() });
    }

    const { endpoint, keys } = parsed.data;
    let userId = "default-user";

    try {
      userId = await ensureUser();
      await prisma.pushSubscription.upsert({
        where: { endpoint },
        update: { userId, p256dh: keys.p256dh, auth: keys.auth },
        create: { userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
      });
      updateMemorySettings(userId, { pushEnabled: true });
    } catch (err) {
      console.warn("[push] Database offline on subscribe, updating in-memory settings:", (err as Error).message);
      updateMemorySettings(userId, { pushEnabled: true });
    }

    return reply.code(201).send({ ok: true });
  });

  app.delete("/api/push/subscribe", async (req, reply) => {
    const bodySchema = z.object({ endpoint: z.string().min(1) });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_failed", details: parsed.error.flatten() });
    }

    let userId = "default-user";
    try {
      userId = await ensureUser();
      await prisma.pushSubscription.deleteMany({
        where: { endpoint: parsed.data.endpoint, userId },
      });
      updateMemorySettings(userId, { pushEnabled: false });
    } catch (err) {
      console.warn("[push] Database offline on unsubscribe, updating in-memory settings:", (err as Error).message);
      updateMemorySettings(userId, { pushEnabled: false });
    }

    return reply.code(204).send();
  });
}
