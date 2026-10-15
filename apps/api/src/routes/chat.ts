import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma, ensureUser, decryptSecret, writeAudit } from "@inboxtasks/db";
import { chatWithActions, type LLMConfig } from "@inboxtasks/llm";
import { proposedActionSchema } from "@inboxtasks/shared";
import { serializeTask } from "../lib/serialize.js";
import * as google from "../lib/google.js";

// ── helpers ──────────────────────────────────────────────────────────────────

async function loadLLMConfig(userId: string, headerKey?: string): Promise<LLMConfig> {
  const settings = await prisma.settings.findUnique({ where: { userId } });
  let geminiApiKey = process.env.GEMINI_API_KEY ?? "";
  if (settings?.geminiKeyRef) {
    try {
      geminiApiKey = decryptSecret(settings.geminiKeyRef);
    } catch {
      /* fall back to env key */
    }
  }
  if (!geminiApiKey && headerKey && headerKey.trim()) {
    geminiApiKey = headerKey.trim();
  }
  return {
    pref: (settings?.aiProviderPref ?? process.env.AI_PROVIDER_PREF ?? "auto") as LLMConfig["pref"],
    ollamaUrl: settings?.ollamaUrl ?? process.env.OLLAMA_URL ?? "http://localhost:11434",
    geminiApiKey,
  };
}

async function buildTasksContext(userId: string): Promise<string> {
  const tasks = await prisma.task.findMany({
    where: {
      userId,
      deletedAt: null,
      status: { in: ["suggested", "accepted", "in_progress"] },
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    take: 50,
  });

  if (tasks.length === 0) return "(no tasks)";

  return tasks
    .map((t) => {
      const due = t.dueDate ? t.dueDate.toISOString().slice(0, 10) : "none";
      return `- id=${t.id} | "${t.title}" | due=${due} | priority=${t.priority} | status=${t.status}`;
    })
    .join("\n");
}

async function bestEffortCalendarPush(userId: string, taskId: string): Promise<void> {
  if (!google.isConfigured()) return;
  google.pushTask(userId, taskId).catch((err: unknown) => {
    console.error(`[chat] calendar push failed taskId=${taskId}: ${(err as Error).message}`);
  });
}

// ── date coerce helper ────────────────────────────────────────────────────────

function parseDueDate(due_date: string | null | undefined): Date | null {
  if (!due_date) return null;
  const d = due_date.includes("T") ? new Date(due_date) : new Date(`${due_date}T00:00:00Z`);
  return isNaN(d.getTime()) ? null : d;
}

// ── routes ───────────────────────────────────────────────────────────────────

export async function chatRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/chat/history
  app.get("/api/chat/history", async () => {
    const userId = await ensureUser();
    const messages = await prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      take: 50,
    });
    return {
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        created_at: m.createdAt.toISOString(),
      })),
    };
  });

  // POST /api/chat
  app.post("/api/chat", async (req, reply) => {
    const bodySchema = z.object({ message: z.string().min(1).max(2000) });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_failed", details: parsed.error.flatten() });
    }

    const userId = await ensureUser();
    const { message } = parsed.data;
    const headerKey = req.headers["x-gemini-key"] as string | undefined;

    // Save user message
    await prisma.chatMessage.create({ data: { userId, role: "user", content: message } });

    // Load recent history (last 10 messages, chronological order)
    const recentMessages = await prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    const history = recentMessages.reverse().map((m) => ({ role: m.role, content: m.content }));
    const tasksContext = await buildTasksContext(userId);
    const cfg = await loadLLMConfig(userId, headerKey);

    const { reply: aiReply, proposed_action } = await chatWithActions(cfg, history, tasksContext);

    // Save assistant reply
    await prisma.chatMessage.create({ data: { userId, role: "assistant", content: aiReply } });

    return { reply: aiReply, proposed_action: proposed_action ?? null };
  });

  // POST /api/chat/confirm
  app.post("/api/chat/confirm", async (req, reply) => {
    const bodySchema = z.object({ action: proposedActionSchema });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_failed", details: parsed.error.flatten() });
    }

    const userId = await ensureUser();
    const { action } = parsed.data;

    if (action.type === "create_task") {
      if (!action.title?.trim()) {
        return reply.code(400).send({ error: "title_required" });
      }
      const dueDate = parseDueDate(action.due_date);
      const task = await prisma.task.create({
        data: {
          userId,
          title: action.title.trim(),
          description: action.description ?? null,
          dueDate,
          priority: action.priority ?? "medium",
          status: "accepted",
          createdVia: "chat",
        },
      });

      if (task.dueDate) {
        void bestEffortCalendarPush(userId, task.id);
      }

      const confirmMsg = `✓ Task "${task.title}" created.`;
      await prisma.chatMessage.create({ data: { userId, role: "assistant", content: confirmMsg } });

      void writeAudit({
        userId,
        action: `chat.${action.type}`,
        targetType: "task",
        targetId: task.id,
      });

      return { ok: true, task: serializeTask(task) };
    }

    if (action.type === "update_task") {
      if (!action.task_id) {
        return reply.code(400).send({ error: "task_id_required" });
      }
      const existing = await prisma.task.findFirst({
        where: { id: action.task_id, userId, deletedAt: null },
      });
      if (!existing) return reply.code(404).send({ error: "not_found" });

      const dueDate = action.due_date !== undefined ? parseDueDate(action.due_date) : undefined;

      const task = await prisma.task.update({
        where: { id: action.task_id },
        data: {
          ...(action.title !== undefined ? { title: action.title } : {}),
          ...(action.description !== undefined ? { description: action.description } : {}),
          ...(dueDate !== undefined ? { dueDate } : {}),
          ...(action.priority !== undefined ? { priority: action.priority } : {}),
          ...(action.status !== undefined ? { status: action.status } : {}),
        },
      });

      if ((task.status === "accepted" || task.status === "in_progress") && task.dueDate) {
        void bestEffortCalendarPush(userId, task.id);
      }

      const confirmMsg = `✓ Task "${task.title}" updated.`;
      await prisma.chatMessage.create({ data: { userId, role: "assistant", content: confirmMsg } });

      void writeAudit({
        userId,
        action: `chat.${action.type}`,
        targetType: "task",
        targetId: task.id,
      });

      return { ok: true, task: serializeTask(task) };
    }

    if (action.type === "complete_task") {
      if (!action.task_id) {
        return reply.code(400).send({ error: "task_id_required" });
      }
      const existing = await prisma.task.findFirst({
        where: { id: action.task_id, userId, deletedAt: null },
      });
      if (!existing) return reply.code(404).send({ error: "not_found" });

      const task = await prisma.task.update({
        where: { id: action.task_id },
        data: { status: "done" },
      });

      const confirmMsg = `✓ Task "${task.title}" marked complete.`;
      await prisma.chatMessage.create({ data: { userId, role: "assistant", content: confirmMsg } });

      void writeAudit({
        userId,
        action: `chat.${action.type}`,
        targetType: "task",
        targetId: task.id,
      });

      return { ok: true, task: serializeTask(task) };
    }

    // TypeScript exhaustive check — should never reach here due to enum validation
    return reply.code(400).send({ error: "unknown_action_type" });
  });
}
