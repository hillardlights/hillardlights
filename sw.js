// Hillard Lights service worker.
//
// - Precaches the core shell (HTML/CSS/JS/data) on install.
// - Navigations use network-first so schedule/announcement changes ship fast;
//   falls back to cache when offline.
// - Everything else is stale-while-revalidate: instant from cache, refresh
//   in the background.
// - Same-origin only. Remote Falcon GraphQL, Google Fonts, and YouTube go
//   straight to the network with no SW involvement.

const CACHE = "hillard-lights-v1";

const CORE = [
    "./",
    "./index.html",
    "./styles.css",
    "./scripts.js",
    "./data.js",
    "./layout-data.js",
    "./zones-data.js",
    "./manifest.webmanifest",
    "./icons/icon.svg",
];

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE)
            .then(cache => cache.addAll(CORE))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(k => k !== CACHE).map(k => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", event => {
    const req = event.request;
    if (req.method !== "GET") return;

    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return;

    // Navigations: network-first so freshness wins.
    if (req.mode === "navigate" || req.destination === "document") {
        event.respondWith(
            fetch(req)
                .then(res => {
                    const copy = res.clone();
                    caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
                    return res;
                })
                .catch(() => caches.match(req).then(r => r || caches.match("./index.html")))
        );
        return;
    }

    // Everything else: stale-while-revalidate.
    event.respondWith(
        caches.match(req).then(cached => {
            const fresh = fetch(req).then(res => {
                if (res && res.status === 200 && res.type === "basic") {
                    const copy = res.clone();
                    caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
                }
                return res;
            }).catch(() => cached);
            return cached || fresh;
        })
    );
});
