import { prisma, decryptSecret } from "@inboxtasks/db";
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
      console.log(`[extract] email=${email.id} provider=${provider} tasks=${tasks.length} @ ${new Date().toISOString()}`);
    } catch (err) {
      // Leave processedAt null so it retries next cycle. Never log body/secrets.
      console.error(`[extract] email=${email.id} FAILED @ ${new Date().toISOString()}: ${(err as Error).message}`);
    }
  }
}
