const CACHE_NAME = 'life-scheduler-v9';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './data.js',
    './render.js',
    './script.js',
    './apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
    self.skipWaiting(); // Force new service worker to activate immediately
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        // Drop stale caches so caches.match never serves old assets
        const keys = await caches.keys();
        await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
        await self.clients.claim(); // Take control of all clients immediately
    })());
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        // ignoreSearch: index.html requests assets as e.g. script.js?v=8 (the
        // version query busts stale HTTP caches); the cache stores them bare.
        // Freshness is still guaranteed by CACHE_NAME versioning, which drops
        // the whole old cache on every service worker update.
        caches.match(event.request, { ignoreSearch: true }).then((response) => {
            return response || fetch(event.request);
        })
    );
});
