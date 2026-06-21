import { api } from "./api.js";
import { urlBase64ToUint8Array } from "./format.js";

export async function enablePush(): Promise<boolean> {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;

    const registration = await navigator.serviceWorker.ready;
    const { publicKey } = await api.vapid();
    const sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
    await api.subscribePush(sub.toJSON());
    return true;
  } catch {
    return false;
  }
}

export async function disablePush(): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const sub = await registration.pushManager.getSubscription();
    if (!sub) return;
    const endpoint = sub.endpoint;
    await sub.unsubscribe();
    await api.unsubscribePush(endpoint);
  } catch {
    // ignore
  }
}
