import webPush from "web-push";
import { prisma } from "@inboxtasks/db";
import { isDueWithin } from "@inboxtasks/shared";

let vapidWarned = false;

export async function sendDueReminders(): Promise<void> {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey) {
    if (!vapidWarned) {
      console.warn("[reminders] VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY not set — skipping push");
      vapidWarned = true;
    }
    return;
  }

  webPush.setVapidDetails(subject ?? "mailto:admin@localhost", publicKey, privateKey);

  // Single-user: load all users' settings + subscriptions
  const users = await prisma.user.findMany({
    include: {
      settings: true,
      pushSubscriptions: true,
    },
  });

  const now = new Date();

  for (const user of users) {
    const leadMinutes = user.settings?.reminderLeadMinutes ?? 60;
    const subscriptions = user.pushSubscriptions;
    if (subscriptions.length === 0) continue;

    const dueTasks = await prisma.task.findMany({
      where: {
        userId: user.id,
        status: { in: ["accepted", "in_progress"] },
        deletedAt: null,
        reminderSentAt: null,
        dueDate: { not: null },
      },
    });

    for (const task of dueTasks) {
      if (!isDueWithin(task.dueDate, now, leadMinutes)) continue;

      const payload = JSON.stringify({
        title: "Task due soon",
        body: task.title,
        taskId: task.id,
      });

      for (const sub of subscriptions) {
        try {
          await webPush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload,
          );
        } catch (err) {
          // Never log subscription keys
          const statusCode = (err as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {
              /* ignore if already deleted */
            });
          } else {
            console.error(`[reminders] push failed for sub=${sub.id}: ${(err as Error).message}`);
          }
        }
      }

      await prisma.task.update({
        where: { id: task.id },
        data: { reminderSentAt: now },
      });
    }
  }
}
