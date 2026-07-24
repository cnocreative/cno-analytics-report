/* CNO Reports service worker — offline app shell.
   Bump CACHE when shipping a new build so clients pick it up. */
const CACHE = "cno-reports-v5";
const SHELL = [
  "./index.html",
  "./fonts.css",
  "./cno-seal.png",
  "./cno-logo.png",
  "./icon-192.png",
  "./icon-512.png",
  "./manifest.webmanifest"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Never touch cross-origin (e.g. AI API calls) — let them go straight to the network.
  if (url.origin !== self.location.origin) return;

  const isDoc = req.mode === "navigate" || url.pathname.endsWith("/index.html") || url.pathname.endsWith("/");
  if (isDoc) {
    // Network-first for the app itself so redeploys land, falling back to cache offline.
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put("./index.html", copy));
        return res;
      }).catch(() => caches.match("./index.html"))
    );
    return;
  }
  // Cache-first for static assets (fonts, images, icons).
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
      return res;
    }).catch(() => hit))
  );
});
