import { google } from "googleapis";
import type { calendar_v3 } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import { prisma, encryptSecret, decryptSecret } from "@inboxtasks/db";

export function isConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function oauthClient(): OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:5173";
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ?? `${webOrigin}/api/calendar/callback`;
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getAuthUrl(): string {
  const client = oauthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/calendar.events"],
  });
}

export async function handleCallback(userId: string, code: string): Promise<void> {
  const client = oauthClient();
  const { tokens } = await client.getToken(code);
  const encrypted = encryptSecret(JSON.stringify(tokens));
  await prisma.settings.update({
    where: { userId },
    data: {
      googleTokenRef: encrypted,
      calendarProvider: "google",
      googleCalendarId: "primary",
    },
  });
}

async function getAuthed(userId: string): Promise<OAuth2Client | null> {
  const settings = await prisma.settings.findUnique({ where: { userId } });
  if (!settings?.googleTokenRef) return null;

  let tokens: Record<string, unknown>;
  try {
    tokens = JSON.parse(decryptSecret(settings.googleTokenRef)) as Record<string, unknown>;
  } catch {
    return null;
  }

  const client = oauthClient();
  client.setCredentials(tokens);

  client.on("tokens", (newTokens) => {
    // Merge with existing tokens and re-encrypt+persist
    const merged = { ...tokens, ...newTokens };
    const encrypted = encryptSecret(JSON.stringify(merged));
    prisma.settings
      .update({ where: { userId }, data: { googleTokenRef: encrypted } })
      .catch((err: unknown) => {
        console.error("[google] failed to persist refreshed tokens:", (err as Error).message);
      });
  });

  return client;
}

function formatEventDates(dueDate: Date): {
  start: { date?: string; dateTime?: string; timeZone?: string };
  end: { date?: string; dateTime?: string; timeZone?: string };
} {
  // All-day: dueDate has midnight UTC time
  const isAllDay =
    dueDate.getUTCHours() === 0 &&
    dueDate.getUTCMinutes() === 0 &&
    dueDate.getUTCSeconds() === 0 &&
    dueDate.getUTCMilliseconds() === 0;

  if (isAllDay) {
    const dateStr = dueDate.toISOString().slice(0, 10);
    const nextDay = new Date(dueDate.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    return { start: { date: dateStr }, end: { date: nextDay } };
  } else {
    const endDate = new Date(dueDate.getTime() + 60 * 60 * 1000);
    return {
      start: { dateTime: dueDate.toISOString(), timeZone: "UTC" },
      end: { dateTime: endDate.toISOString(), timeZone: "UTC" },
    };
  }
}

export async function pushTask(userId: string, taskId: string): Promise<void> {
  try {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task || !task.dueDate) return;

    const client = await getAuthed(userId);
    if (!client) return;

    const settings = await prisma.settings.findUnique({ where: { userId } });
    const calendarId = settings?.googleCalendarId ?? "primary";
    const calendar = google.calendar({ version: "v3", auth: client });

    const eventDates = formatEventDates(task.dueDate);
    const eventBody = {
      summary: task.title,
      description: task.description ?? "",
      ...eventDates,
    };

    const existingLink = await prisma.calendarLink.findFirst({
      where: { taskId, provider: "google" },
    });

    if (existingLink) {
      const res = await calendar.events.patch({
        calendarId,
        eventId: existingLink.externalEventId,
        requestBody: eventBody,
      });
      await prisma.calendarLink.update({
        where: { id: existingLink.id },
        data: { etag: res.data.etag ?? null, lastSyncedAt: new Date() },
      });
    } else {
      const res = await calendar.events.insert({
        calendarId,
        requestBody: eventBody,
      });
      if (res.data.id) {
        await prisma.calendarLink.create({
          data: {
            userId,
            taskId,
            provider: "google",
            externalEventId: res.data.id,
            etag: res.data.etag ?? null,
            lastSyncedAt: new Date(),
          },
        });
      }
    }
  } catch (err) {
    // Best-effort — swallow and log
    console.error(`[google] pushTask taskId=${taskId}: ${(err as Error).message}`);
  }
}

export async function deleteEvent(userId: string, taskId: string): Promise<void> {
  try {
    const link = await prisma.calendarLink.findFirst({ where: { taskId, provider: "google" } });
    if (!link) return;

    const client = await getAuthed(userId);
    if (!client) return;

    const settings = await prisma.settings.findUnique({ where: { userId } });
    const calendarId = settings?.googleCalendarId ?? "primary";
    const calendar = google.calendar({ version: "v3", auth: client });

    await calendar.events.delete({ calendarId, eventId: link.externalEventId });
    await prisma.calendarLink.delete({ where: { id: link.id } });
  } catch (err) {
    console.error(`[google] deleteEvent taskId=${taskId}: ${(err as Error).message}`);
  }
}

export async function pullChanges(
  userId: string,
): Promise<{ updated: number; removed: number }> {
  const client = await getAuthed(userId);
  if (!client) return { updated: 0, removed: 0 };

  const settings = await prisma.settings.findUnique({ where: { userId } });
  const calendarId = settings?.googleCalendarId ?? "primary";
  const calendar = google.calendar({ version: "v3", auth: client });

  let updated = 0;
  let removed = 0;

  const listParams: calendar_v3.Params$Resource$Events$List = {
    calendarId,
    singleEvents: true,
    ...(settings?.calendarSyncToken ? { syncToken: settings.calendarSyncToken } : {}),
  };

  let resData: calendar_v3.Schema$Events;
  try {
    const r = await calendar.events.list(listParams);
    resData = r.data;
  } catch (err) {
    // 410 GONE: sync token expired — clear and retry full list
    if ((err as { code?: number }).code === 410) {
      await prisma.settings.update({ where: { userId }, data: { calendarSyncToken: null } });
      const r2 = await calendar.events.list({ calendarId, singleEvents: true });
      resData = r2.data;
    } else {
      throw err;
    }
  }

  const items = resData.items ?? [];

  for (const event of items) {
    if (!event.id) continue;

    const link = await prisma.calendarLink.findFirst({
      where: { externalEventId: event.id, provider: "google" },
    });
    if (!link) continue;

    if (event.status === "cancelled") {
      await prisma.calendarLink.delete({ where: { id: link.id } });
      removed++;
      continue;
    }

    // Update task title + dueDate from event
    const startDate = event.start?.dateTime ?? event.start?.date ?? null;
    const newDueDate = startDate ? new Date(startDate) : null;

    await prisma.task.update({
      where: { id: link.taskId },
      data: {
        title: event.summary ?? undefined,
        dueDate: newDueDate,
      },
    });
    updated++;
  }

  if (resData.nextSyncToken) {
    await prisma.settings.update({
      where: { userId },
      data: { calendarSyncToken: resData.nextSyncToken },
    });
  }

  return { updated, removed };
}
