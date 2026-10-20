// Hand-written service worker: network-first shell, cache-first hashed assets.
// Never touches /api/*, /admin* or /auth/* (private data must never be cached).
const SHELL = "ipadhub-shell-v1";
const ASSETS = "ipadhub-assets-v1";
const MAX_ASSETS = 60; // old hashed assets pile up across deploys on an always-on device

async function trimAssets(cache) {
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_ASSETS)).map((k) => cache.delete(k)));
}

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== SHELL && k !== ASSETS).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const p = url.pathname;
  if (p.startsWith("/api/") || p.startsWith("/admin") || p.startsWith("/auth/")) return;

  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req, { cache: "no-store" });
          if (res.status === 200) {
            const cache = await caches.open(SHELL);
            await cache.put("/", res.clone());
          }
          return res;
        } catch (err) {
          const cached = await caches.match("/", { cacheName: SHELL });
          if (cached) return cached;
          throw err;
        }
      })(),
    );
    return;
  }

  if (p.startsWith("/assets/")) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(ASSETS);
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        // A missing asset gets the SPA fallback (index.html, 200); never cache that as an asset.
        const type = res.headers.get("content-type") || "";
        if (res.status === 200 && !type.includes("text/html")) {
          await cache.put(req, res.clone());
          await trimAssets(cache);
        }
        return res;
      })(),
    );
  }
});
