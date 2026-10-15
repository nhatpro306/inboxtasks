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
    try {
      const userId = await ensureUser();
      return await publicSettings(userId);
    } catch (err) {
      console.warn("[settings] Database unavailable, returning fallback settings:", (err as Error).message);
      return {
        ai_provider_pref: "auto",
        ollama_url: "http://localhost:11434",
        poll_interval_minutes: 60,
        reminder_lead_minutes: 60,
        calendar_provider: null,
        gemini_key_masked: "",
        calendar_connected: false,
        push_enabled: false,
      };
    }
  });

  app.post("/api/settings/test-gemini", async (req, reply) => {
    const bodySchema = z.object({
      gemini_key: z.string().min(1),
    });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_failed", details: parsed.error.flatten() });
    }

    const { gemini_key } = parsed.data;
    const trimmedKey = gemini_key.trim();
    if (!trimmedKey) {
      return reply.code(200).send({ ok: false, error: "API key cannot be empty" });
    }

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(trimmedKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: "ping" }] }],
          }),
          signal: AbortSignal.timeout(10000),
        }
      );

      if (res.ok) {
        return { ok: true };
      }

      let message = `Gemini API returned status ${res.status}`;
      try {
        const data = (await res.json()) as { error?: { message?: string } };
        if (data?.error?.message) {
          message = data.error.message;
        }
      } catch {
        // Fall back to default status message if body is not JSON
      }

      return reply.code(200).send({ ok: false, error: message });
    } catch (err) {
      const message = (err as Error).message || "Network error";
      return reply.code(200).send({ ok: false, error: message });
    }
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

    let userId: string;
    try {
      userId = await ensureUser();
    } catch (err) {
      console.warn("[settings] Database offline, ensureUser failed:", (err as Error).message);
      userId = "default-user";
    }

    const b = parsed.data;

    const updateData: Record<string, unknown> = {};
    if (b.ai_provider_pref !== undefined) updateData.aiProviderPref = b.ai_provider_pref;
    if (b.ollama_url !== undefined) updateData.ollamaUrl = b.ollama_url;
    if (b.poll_interval_minutes !== undefined) updateData.pollIntervalMinutes = b.poll_interval_minutes;
    if (b.reminder_lead_minutes !== undefined) updateData.reminderLeadMinutes = b.reminder_lead_minutes;
    let geminiKeyChanged = false;
    let isKeyCleared = false;
    if (b.gemini_key !== undefined) {
      geminiKeyChanged = true;
      const trimmedKey = b.gemini_key.trim();
      if (trimmedKey === "") {
        updateData.geminiKeyRef = null;
        isKeyCleared = true;
      } else {
        updateData.geminiKeyRef = encryptSecret(trimmedKey);
      }
    }

    try {
      await prisma.settings.upsert({
        where: { userId },
        update: updateData,
        create: {
          userId,
          aiProviderPref: "auto",
          pollIntervalMinutes: 60,
          reminderLeadMinutes: 60,
          ...updateData,
        },
      });
    } catch (dbErr) {
      console.warn("[settings] Database offline or write failed, returning in-memory fallback:", (dbErr as Error).message);
    }

    if (geminiKeyChanged) {
      // NEVER log the key value in meta
      void writeAudit({
        userId,
        action: "settings.gemini_key_changed",
        targetType: "settings",
        meta: { cleared: isKeyCleared },
      }).catch(() => {});
    }

    try {
      return await publicSettings(userId);
    } catch (err) {
      console.warn("[settings] Database offline, returning safe fallback:", (err as Error).message);
      return {
        ai_provider_pref: (b.ai_provider_pref as "auto" | "local" | "gemini") ?? "auto",
        ollama_url: b.ollama_url ?? "http://localhost:11434",
        poll_interval_minutes: b.poll_interval_minutes ?? 60,
        reminder_lead_minutes: b.reminder_lead_minutes ?? 60,
        calendar_provider: null,
        gemini_key_masked: b.gemini_key !== undefined ? (b.gemini_key.trim() ? maskSecret(b.gemini_key.trim()) : "") : "",
        calendar_connected: false,
        push_enabled: false,
      };
    }
  });
}
