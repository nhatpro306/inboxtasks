import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma, ensureUser } from "@inboxtasks/db";
import { serializeTask } from "../lib/serialize.js";
import * as google from "../lib/google.js";
import { runCycle } from "@inboxtasks/pipeline";

const uuidParam = z.object({ id: z.string().uuid() });

const dueDateCoerce = z
  .string()
  .nullable()
  .optional()
  .transform((v) => {
    if (v == null || v === "") return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  });

async function bestEffortPush(userId: string, taskId: string): Promise<void> {
  if (!google.isConfigured()) return;
  google.pushTask(userId, taskId).catch((err: unknown) => {
    console.error(`[tasks] calendar push failed taskId=${taskId}: ${(err as Error).message}`);
  });
}

export async function taskRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/tasks
  app.get("/api/tasks", async (req, reply) => {
    const querySchema = z.object({
      status: z.string().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    });
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_failed", details: parsed.error.flatten() });
    }
    const { status, from, to } = parsed.data;
    const userId = await ensureUser();

    const statuses = status ? status.split(",").map((s) => s.trim()) : null;

    const tasks = await prisma.task.findMany({
      where: {
        userId,
        deletedAt: null,
        status: statuses
          ? { in: statuses as ("suggested" | "accepted" | "in_progress" | "done" | "dismissed")[] }
          : { notIn: ["suggested", "dismissed"] },
        ...(from || to
          ? {
              dueDate: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    });

    return { tasks: tasks.map(serializeTask) };
  });

  // POST /api/tasks
  app.post("/api/tasks", async (req, reply) => {
    const bodySchema = z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      due_date: dueDateCoerce,
      priority: z.enum(["low", "medium", "high"]).default("medium"),
    });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_failed", details: parsed.error.flatten() });
    }
    const b = parsed.data;
    const userId = await ensureUser();

    const task = await prisma.task.create({
      data: {
        userId,
        title: b.title,
        description: b.description ?? null,
        dueDate: b.due_date ?? null,
        priority: b.priority,
        status: "accepted",
        createdVia: "manual",
      },
    });

    // Best-effort calendar push
    if (task.dueDate) {
      void bestEffortPush(userId, task.id);
    }

    return reply.code(201).send(serializeTask(task));
  });

  // PATCH /api/tasks/:id
  app.patch("/api/tasks/:id", async (req, reply) => {
    const params = uuidParam.safeParse(req.params);
    if (!params.success) return reply.code(400).send({ error: "invalid_id" });

    const bodySchema = z.object({
      title: z.string().min(1).optional(),
      description: z.string().nullable().optional(),
      due_date: dueDateCoerce,
      priority: z.enum(["low", "medium", "high"]).optional(),
      status: z.enum(["suggested", "accepted", "in_progress", "done", "dismissed"]).optional(),
    });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_failed", details: parsed.error.flatten() });
    }

    const userId = await ensureUser();
    const existing = await prisma.task.findFirst({
      where: { id: params.data.id, userId, deletedAt: null },
    });
    if (!existing) return reply.code(404).send({ error: "not_found" });

    const b = parsed.data;
    const task = await prisma.task.update({
      where: { id: params.data.id },
      data: {
        ...(b.title !== undefined ? { title: b.title } : {}),
        ...(b.description !== undefined ? { description: b.description } : {}),
        ...(b.due_date !== undefined ? { dueDate: b.due_date } : {}),
        ...(b.priority !== undefined ? { priority: b.priority } : {}),
        ...(b.status !== undefined ? { status: b.status } : {}),
      },
    });

    // Best-effort calendar push if accepted/in_progress with due_date
    if (
      (task.status === "accepted" || task.status === "in_progress") &&
      task.dueDate
    ) {
      void bestEffortPush(userId, task.id);
    }

    return serializeTask(task);
  });

  // POST /api/tasks/:id/accept
  app.post("/api/tasks/:id/accept", async (req, reply) => {
    const params = uuidParam.safeParse(req.params);
    if (!params.success) return reply.code(400).send({ error: "invalid_id" });

    const userId = await ensureUser();
    const existing = await prisma.task.findFirst({
      where: { id: params.data.id, userId, deletedAt: null },
    });
    if (!existing) return reply.code(404).send({ error: "not_found" });

    const task = await prisma.task.update({
      where: { id: params.data.id },
      data: { status: "accepted" },
    });

    if (task.dueDate) {
      void bestEffortPush(userId, task.id);
    }

    return serializeTask(task);
  });

  // POST /api/tasks/:id/dismiss
  app.post("/api/tasks/:id/dismiss", async (req, reply) => {
    const params = uuidParam.safeParse(req.params);
    if (!params.success) return reply.code(400).send({ error: "invalid_id" });

    const userId = await ensureUser();
    const existing = await prisma.task.findFirst({
      where: { id: params.data.id, userId, deletedAt: null },
    });
    if (!existing) return reply.code(404).send({ error: "not_found" });

    const task = await prisma.task.update({
      where: { id: params.data.id },
      data: { status: "dismissed" },
    });

    return serializeTask(task);
  });

  // DELETE /api/tasks/:id
  app.delete("/api/tasks/:id", async (req, reply) => {
    const params = uuidParam.safeParse(req.params);
    if (!params.success) return reply.code(400).send({ error: "invalid_id" });

    const bodySchema = z.object({ confirm: z.literal(true) });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "confirm_required" });
    }

    const userId = await ensureUser();
    const existing = await prisma.task.findFirst({
      where: { id: params.data.id, userId, deletedAt: null },
    });
    if (!existing) return reply.code(404).send({ error: "not_found" });

    // Best-effort delete linked calendar event
    if (google.isConfigured()) {
      google.deleteEvent(userId, params.data.id).catch((err: unknown) => {
        console.error(`[tasks] calendar delete failed taskId=${params.data.id}: ${(err as Error).message}`);
      });
    }

    await prisma.task.update({
      where: { id: params.data.id },
      data: { deletedAt: new Date() },
    });

    return { deleted: true };
  });

  // GET /api/suggestions
  app.get("/api/suggestions", async () => {
    const userId = await ensureUser();
    const tasks = await prisma.task.findMany({
      where: { userId, status: "suggested", deletedAt: null },
      orderBy: { aiConfidence: "desc" },
      include: { sourceEmail: true },
    });

    return {
      suggestions: tasks.map((t) => ({
        ...serializeTask(t),
        source_email: t.sourceEmail
          ? { subject: t.sourceEmail.subject, from: t.sourceEmail.fromAddress }
          : null,
        match: t.aiConfidence != null ? Math.round(t.aiConfidence * 100) : null,
      })),
    };
  });

  // POST /api/scan-now
  app.post("/api/scan-now", async (_req, reply) => {
    runCycle().catch((err: unknown) => {
      console.error("[scan-now] cycle error:", (err as Error).message);
    });
    return reply.code(202).send({ status: "scanning" });
  });
}
