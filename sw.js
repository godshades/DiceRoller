const CACHE_NAME = 'dice-roller-cache-v1';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
   // Add paths to your icons here if you want them cached immediately
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
   // Add other assets like die face images if you use them
];

// Install event: Cache core assets
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching app shell');
        return cache.addAll(URLS_TO_CACHE);
      })
      .then(() => {
        console.log('Service Worker: Installation complete');
        return self.skipWaiting(); // Activate worker immediately
      })
      .catch(error => {
        console.error('Service Worker: Installation failed', error);
      })
  );
});

// Activate event: Clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  const cacheWhitelist = [CACHE_NAME]; // Only keep the current cache version
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
        console.log('Service Worker: Activation complete');
        return self.clients.claim(); // Take control of open clients immediately
    })
  );
});

// Fetch event: Serve cached content when offline (Cache-First strategy)
self.addEventListener('fetch', event => {
    // console.log('Service Worker: Fetching', event.request.url);
    event.respondWith(
        caches.match(event.request) // Check cache first
            .then(response => {
                if (response) {
                    // console.log('Service Worker: Found in cache', event.request.url);
                    return response; // Return cached version
                }
                // console.log('Service Worker: Not in cache, fetching from network', event.request.url);
                return fetch(event.request) // Fetch from network if not in cache
                    .then(networkResponse => {
                        // Optional: Cache the new response dynamically (be careful with what you cache)
                        // if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
                        //    const responseToCache = networkResponse.clone();
                        //    caches.open(CACHE_NAME)
                        //        .then(cache => cache.put(event.request, responseToCache));
                        // }
                        return networkResponse;
                    })
                    .catch(error => {
                         console.error('Service Worker: Fetch failed', error);
                         // Optional: Return a fallback offline page here if appropriate
                         // return caches.match('/offline.html');
                    });
            })
    );
});