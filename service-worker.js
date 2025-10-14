const CACHE_NAME = 'atlas-cache-v2'; // Renamed cache for the new branding and asset updates
const urlsToCache = [
  '.',
  'index.html',
  'index.tsx',
  'logo.svg',
  'manifest.json',
  'locales/en.json',
  'locales/fr.json',
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

self.addEventListener('fetch', event => {
    const { request } = event;

    // We only handle GET requests.
    if (request.method !== 'GET') {
        return;
    }

    // For HTML and local assets, use a Cache First strategy.
    const isAppShell = urlsToCache.some(url => request.url.endsWith(url));
    const isCDN = request.url.includes('aistudiocdn.com') || request.url.includes('fonts.googleapis.com') || request.url.includes('fonts.gstatic.com');

    if (isAppShell || isCDN) {
        event.respondWith(
            caches.match(request).then(response => {
                return response || fetch(request).then(fetchResponse => {
                    const responseToCache = fetchResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(request, responseToCache);
                    });
                    return fetchResponse;
                });
            })
        );
        return;
    }
    
    // For all other requests (like data URLs for CSVs), use a Network First, then Cache strategy.
    event.respondWith(
        fetch(request)
            .then(response => {
                // If the fetch is successful, update the cache.
                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(request, responseToCache);
                });
                return response;
            })
            .catch(() => {
                // If the fetch fails (e.g., offline), try to get the response from the cache.
                return caches.match(request).then(response => {
                    if (response) {
                        return response;
                    }
                    // Optional: return a custom offline page if the request is for a navigation and not in cache.
                    // if (request.mode === 'navigate') {
                    //   return caches.match('/offline.html');
                    // }
                });
            })
    );
});