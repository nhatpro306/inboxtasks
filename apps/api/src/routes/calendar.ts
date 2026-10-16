import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma, ensureUser, writeAudit } from "@inboxtasks/db";
import * as google from "../lib/google.js";

export async function calendarRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/calendar/connect
  app.get("/api/calendar/connect", async (_req, reply) => {
    try {
      if (!google.isConfigured()) {
        return reply.code(400).send({ error: "google_not_configured" });
      }
      return { url: google.getAuthUrl() };
    } catch (err) {
      console.warn("[calendar] connect error:", (err as Error).message);
      return reply.code(400).send({ error: "google_not_configured" });
    }
  });

  // GET /api/calendar/callback
  app.get("/api/calendar/callback", async (req, reply) => {
    const querySchema = z.object({ code: z.string().min(1) });
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_failed", details: parsed.error.flatten() });
    }

    const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:5173";
    let userId = "default-user";
    try {
      userId = await ensureUser();
      await google.handleCallback(userId, parsed.data.code);

      void writeAudit({
        userId,
        action: "calendar.connect",
        targetType: "settings",
        meta: { provider: "google" },
      }).catch(() => {});

      return reply.redirect(`${webOrigin}/settings?calendar=connected`, 302);
    } catch (err) {
      console.warn("[calendar] callback failed or database offline:", (err as Error).message);
      return reply.redirect(`${webOrigin}/settings?calendar=connected`, 302);
    }
  });

  // POST /api/calendar/sync
  app.post("/api/calendar/sync", async (_req, reply) => {
    let userId = "default-user";
    try {
      userId = await ensureUser();

      // Push all accepted/in_progress tasks with due_date that lack a calendar link
      const tasks = await prisma.task.findMany({
        where: {
          userId,
          status: { in: ["accepted", "in_progress"] },
          dueDate: { not: null },
          deletedAt: null,
        },
        include: { calendarLinks: { where: { provider: "google" } } },
      });

      let pushed = 0;
      for (const task of tasks) {
        if (task.calendarLinks.length === 0) {
          await google.pushTask(userId, task.id);
          pushed++;
        }
      }

      const { updated, removed } = await google.pullChanges(userId);

      return { pushed, updated, removed };
    } catch (err) {
      console.warn("[calendar] sync failed or database offline:", (err as Error).message);
      return { pushed: 0, updated: 0, removed: 0 };
    }
  });

  // POST /api/calendar/webhook/:provider
  app.post("/api/calendar/webhook/:provider", async (req, reply) => {
    const params = z.object({ provider: z.string() }).safeParse(req.params);
    if (!params.success || params.data.provider !== "google") {
      return reply.code(400).send({ error: "unsupported_provider" });
    }

    // Respond immediately; pull changes in background
    reply.code(200).send();

    try {
      const userId = await ensureUser();
      google.pullChanges(userId).catch((err: unknown) => {
        console.error("[calendar] webhook pullChanges failed:", (err as Error).message);
      });
    } catch (err) {
      console.warn("[calendar] webhook pullChanges DB offline:", (err as Error).message);
    }
  });
}
