/// <reference lib="webworker" />
import { precacheAndRoute } from "workbox-precaching";

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision: string | null }> };

precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener("push", (event: PushEvent) => {
  const data = event.data ? (() => { try { return event.data!.json(); } catch { return { title: "InboxTasks", body: event.data!.text() }; } })() : { title: "InboxTasks", body: "" };
  event.waitUntil(
    self.registration.showNotification(data.title ?? "InboxTasks", {
      body: data.body ?? "",
      icon: "/pwa-192.png",
      badge: "/pwa-192.png",
      data: { taskId: data.taskId },
    }),
  );
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow("/"));
});
