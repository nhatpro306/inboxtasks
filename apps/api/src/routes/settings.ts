import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma, ensureUser, encryptSecret, decryptSecret, writeAudit } from "@inboxtasks/db";
import { maskSecret } from "@inboxtasks/shared";

function maskGeminiKey(settings: {
  geminiKeyRef: string | null;
}): string {
  if (!settings.geminiKeyRef) return "";
  try {
    const raw = decryptSecret(settings.geminiKeyRef);
    return maskSecret(raw);
  } catch {
    return "";
  }
}

async function publicSettings(userId: string) {
  const settings = await prisma.settings.findUnique({ where: { userId } });
  const subCount = await prisma.pushSubscription.count({ where: { userId } });

  return {
    ai_provider_pref: settings?.aiProviderPref ?? "auto",
    ollama_url: settings?.ollamaUrl ?? "http://localhost:11434",
    poll_interval_minutes: settings?.pollIntervalMinutes ?? 60,
    reminder_lead_minutes: settings?.reminderLeadMinutes ?? 60,
    calendar_provider: settings?.calendarProvider ?? null,
    gemini_key_masked: settings ? maskGeminiKey(settings) : "",
    calendar_connected: !!(settings?.googleTokenRef),
    push_enabled: subCount > 0,
  };
}

export async function settingsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/settings", async () => {
    const userId = await ensureUser();
    return publicSettings(userId);
  });

  app.put("/api/settings", async (req, reply) => {
    const bodySchema = z.object({
      ai_provider_pref: z.enum(["auto", "local", "gemini"]).optional(),
      ollama_url: z.string().url().optional(),
      poll_interval_minutes: z.number().int().min(1).max(1440).optional(),
      reminder_lead_minutes: z.number().int().min(0).max(1440).optional(),
      gemini_key: z.string().optional(),
    });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_failed", details: parsed.error.flatten() });
    }

    const userId = await ensureUser();
    const b = parsed.data;

    const updateData: Record<string, unknown> = {};
    if (b.ai_provider_pref !== undefined) updateData.aiProviderPref = b.ai_provider_pref;
    if (b.ollama_url !== undefined) updateData.ollamaUrl = b.ollama_url;
    if (b.poll_interval_minutes !== undefined) updateData.pollIntervalMinutes = b.poll_interval_minutes;
    if (b.reminder_lead_minutes !== undefined) updateData.reminderLeadMinutes = b.reminder_lead_minutes;
    let geminiKeyChanged = false;
    if (b.gemini_key !== undefined) {
      geminiKeyChanged = true;
      if (b.gemini_key === "") {
        updateData.geminiKeyRef = null;
      } else {
        updateData.geminiKeyRef = encryptSecret(b.gemini_key);
      }
    }

    await prisma.settings.update({ where: { userId }, data: updateData });

    if (geminiKeyChanged) {
      // NEVER log the key value in meta
      void writeAudit({
        userId,
        action: "settings.gemini_key_changed",
        targetType: "settings",
        meta: { cleared: b.gemini_key === "" },
      });
    }

    return publicSettings(userId);
  });
}
