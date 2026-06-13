import { GetPushPublicKeyFetcher } from "@/data/fetchers/push/get-public-key";
import { pushSubscribeMutation } from "@/data/mutations/push-subscribe";
import { pushUnsubscribeMutation } from "@/data/mutations/push-unsubscribe";

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** Registers the service worker (idempotent) and resolves once it's ready. */
export async function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    return await navigator.serviceWorker.ready;
  } catch (error) {
    console.error("Service worker registration failed", error);
    return null;
  }
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

/**
 * Requests permission, subscribes via the VAPID public key, and registers the
 * subscription with the API. Returns true on success.
 */
export async function subscribeToPush(): Promise<boolean> {
  if (!isPushSupported()) return false;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  const publicKey = await GetPushPublicKeyFetcher();
  if (!publicKey) {
    console.warn("No VAPID public key available — push not configured.");
    return false;
  }

  const reg = await ensureServiceWorker();
  if (!reg) return false;

  const existing = await reg.pushManager.getSubscription();
  const subscription =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToArrayBuffer(publicKey),
    }));

  await pushSubscribeMutation(subscription.toJSON());
  return true;
}

/** Unsubscribes locally and removes the subscription from the API. */
export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return;
  const sub = await getExistingSubscription();
  if (!sub) return;
  const { endpoint } = sub;
  try {
    await sub.unsubscribe();
  } finally {
    await pushUnsubscribeMutation(endpoint).catch(() => undefined);
  }
}

function urlBase64ToArrayBuffer(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buffer;
}
