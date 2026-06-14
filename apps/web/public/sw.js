/* Maanaim service worker — web push + a crash-safe static asset cache.
 *
 * Design rules (why this file looks the way it does):
 *  - Page navigations are NEVER served from cache. A standalone PWA can sit on
 *    an old cached HTML document for days; if that HTML points at build chunks
 *    that a later deploy has purged, the app throws ChunkLoadError and dies.
 *    Always going to the network keeps the document and its chunks in lockstep.
 *  - Hashed build assets (/_next/static) are cache-first because their URLs are
 *    immutable, but we ONLY cache successful (200) responses — caching a
 *    transient 404 from an in-flight deploy would poison that route forever.
 *  - Cross-origin requests (the API on another origin) are never intercepted,
 *    so auth/data calls always hit the network.
 *
 * Bump CACHE on any change here: the activate handler deletes every cache whose
 * name isn't the current one, which evicts stale/poisoned caches on existing
 * installs the moment this worker activates.
 */

const CACHE = "maanaim-v2";
const PRECACHE = [
  "/site.webmanifest",
  "/logo.png",
  "/android-chrome-192x192.png",
  "/android-chrome-512x512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Only handle same-origin GETs; the API lives on another origin.
  if (url.origin !== self.location.origin) return;

  // Page navigations → network-only. Never serve a stale document, because a
  // stale document can reference build chunks that no longer exist.
  if (request.mode === "navigate") return;

  // Immutable hashed build assets → cache-first, but only cache 200 responses.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            if (res && res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(request, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  // Precached brand assets → cache-first, otherwise just go to the network.
  if (PRECACHE.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request)),
    );
  }
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "Maanaim", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "Maanaim";
  const options = {
    body: payload.body || "",
    icon: "/android-chrome-192x192.png",
    badge: "/favicon-32x32.png",
    tag: payload.type || "maanaim",
    data: { url: payload.url || "/notificacoes" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          const clientUrl = new URL(client.url);
          if (clientUrl.origin === self.location.origin && "focus" in client) {
            client.navigate(target).catch(() => undefined);
            return client.focus();
          }
        }
        return self.clients.openWindow(target);
      }),
  );
});
