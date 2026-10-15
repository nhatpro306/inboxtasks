import { prisma, decryptSecret, writeAudit } from "@inboxtasks/db";
import { extractWithFailover, type LLMConfig } from "@inboxtasks/llm";

async function loadLLMConfig(userId: string): Promise<LLMConfig> {
  const settings = await prisma.settings.findUnique({ where: { userId } });
  let geminiApiKey = process.env.GEMINI_API_KEY ?? "";
  if (settings?.geminiKeyRef) {
    try {
      geminiApiKey = decryptSecret(settings.geminiKeyRef);
    } catch {
      /* fall back to env key */
    }
  }
  return {
    pref: (settings?.aiProviderPref ?? process.env.AI_PROVIDER_PREF ?? "auto") as LLMConfig["pref"],
    ollamaUrl: settings?.ollamaUrl ?? process.env.OLLAMA_URL ?? "http://localhost:11434",
    geminiApiKey,
  };
}

async function safeWriteAudit(entry: {
  userId: string;
  action: string;
  targetType: string;
  targetId?: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    if (typeof writeAudit === "function") {
      await writeAudit(entry);
    }
  } catch {
    /* never throw from audit logging */
  }
}

// Map to track transient failure retries per email ID to prevent infinite loops even on persistent errors
const emailFailures = new Map<string, number>();
const MAX_EXTRACTION_RETRIES = 3;

function isTransientError(errMsg: string): boolean {
  return /LLM unavailable|service unavailable|econnrefused|etimedout|network|rate limit/i.test(errMsg);
}

// Extract tasks from a single email and persist them with status='suggested'.
export async function extractTasksFromEmail(email: {
  id: string;
  userId: string;
  subject: string | null;
  cleanSnippet: string;
}): Promise<{ provider: string; tasksCount: number }> {
  const cfg = await loadLLMConfig(email.userId);
  const { provider, tasks } = await extractWithFailover(cfg, {
    subject: email.subject ?? "",
    snippet: email.cleanSnippet,
  });
  for (const t of tasks) {
    await prisma.task.create({
      data: {
        userId: email.userId,
        sourceEmailId: email.id,
        title: t.title,
        description: t.description ?? null,
        dueDate: t.due_date ? new Date(`${t.due_date}T00:00:00Z`) : null,
        priority: t.priority ?? "medium",
        status: "suggested",
        createdVia: "ai",
        aiConfidence: t.confidence,
      },
    });
  }
  await prisma.email.update({ where: { id: email.id }, data: { processedAt: new Date() } });
  return { provider, tasksCount: tasks.length };
}

// Process emails that have not yet been through extraction. AI output is saved ONLY as status='suggested'.
export async function processUnprocessedEmails(limit = 50): Promise<void> {
  const emails = await prisma.email.findMany({
    where: { processedAt: null },
    orderBy: { receivedAt: "asc" },
    take: limit,
  });
  if (emails.length === 0) return;

  for (const email of emails) {
    try {
      // Guard against unprocessable/corrupted emails with empty content
      if (!email.cleanSnippet && !email.subject) {
        console.warn(`[extract] email=${email.id} has no subject or snippet — marking as processed @ ${new Date().toISOString()}`);
        await prisma.email.update({ where: { id: email.id }, data: { processedAt: new Date() } });
        await safeWriteAudit({
          userId: email.userId,
          action: "extract_skipped_empty",
          targetType: "email",
          targetId: email.id,
        });
        continue;
      }

      const { provider, tasksCount } = await extractTasksFromEmail(email);
      emailFailures.delete(email.id);
      console.log(`[extract] email=${email.id} provider=${provider} tasks=${tasksCount} @ ${new Date().toISOString()}`);
    } catch (err) {
      const errMsg = (err as Error)?.message ?? String(err);
      const isTransient = isTransientError(errMsg);
      const attempts = (emailFailures.get(email.id) ?? 0) + 1;
      emailFailures.set(email.id, attempts);

      if (isTransient && attempts < MAX_EXTRACTION_RETRIES) {
        // Leave processedAt null so it retries next cycle. Never log body/secrets.
        console.error(`[extract] email=${email.id} FAILED @ ${new Date().toISOString()}: ${(err as Error).message}`);
      } else {
        // Unprocessable or corrupted email (or retry limit exceeded): mark processedAt so the pipeline does not stall or loop indefinitely.
        emailFailures.delete(email.id);
        console.error(`[extract] email=${email.id} UNPROCESSABLE @ ${new Date().toISOString()}: ${errMsg}`);
        try {
          await prisma.email.update({ where: { id: email.id }, data: { processedAt: new Date() } });
        } catch (updateErr) {
          console.error(`[extract] failed to mark email=${email.id} as processed: ${(updateErr as Error).message}`);
        }
        await safeWriteAudit({
          userId: email.userId,
          action: "extract_failed",
          targetType: "email",
          targetId: email.id,
          meta: { error: errMsg.slice(0, 500), attempts },
        });
      }
    }
  }
}

