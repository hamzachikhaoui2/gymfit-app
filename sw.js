const CACHE = "gymfit-v8";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./lock.js",
  "./render.js",
  "./data.enc.json",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
  "./fonts/fraunces-var.woff2",
  "./fonts/fraunces-italic-var.woff2",
  "./fonts/dmsans-var.woff2",
];

self.addEventListener("install", (e) => {
  // skipWaiting() must be chained inside waitUntil's extended lifetime, not
  // called bare alongside it — called bare, the new worker can get stuck in
  // "waiting" indefinitely instead of activating.
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetchPromise = fetch(e.request)
        .then((res) => {
          if (res && res.status === 200 && e.request.method === "GET") {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
