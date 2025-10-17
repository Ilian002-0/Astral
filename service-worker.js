const CACHE_NAME = 'atlas-cache-v5'; // Incremented cache version
const urlsToCache = [
  '/',
  '/index.html',
  '/index.tsx',
  '/App.tsx',
  '/logo.svg',
  '/manifest.json',
  '/locales/en.json',
  '/locales/fr.json',
];

// Install a service worker
self.addEventListener('install', event => {
  // Perform install steps
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        // Add core assets to cache. Other assets will be cached on-the-fly.
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting()) // Activate new service worker immediately
  );
});

// Update a service worker and clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control of all open pages
  );
});

// Use a Network First, then Cache strategy for all GET requests.
// This ensures that online users get the latest version, while offline users can still access the cached app.
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then(response => {
                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, responseToCache);
                });
                return response;
            })
            .catch(() => {
                return caches.match(event.request);
            })
    );
});