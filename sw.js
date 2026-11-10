// El Rincón de Rincón - service worker
// Siempre pide la versión más reciente a internet. Solo usa la copia guardada si no hay conexión.
const CACHE = "elrincon-v8";

self.addEventListener("install", e => {
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (u.origin !== self.location.origin) return;
  e.respondWith(
    fetch(r, { cache: "no-store" })
      .then(res => {
        if (res && res.ok) {
          const copia = res.clone();
          caches.open(CACHE).then(c => c.put(r, copia));
        }
        return res;
      })
      .catch(() => caches.match(r)
        .then(m => m || caches.match("index.html"))
        .then(m => m || caches.match("./")))
  );
});
