const CACHE = 'pilltalk-v3';
const OFFLINE_URL = '/offline';

const PRECACHE = [
  '/',
  '/app',
  '/mymeds',
  '/symptoms',
  '/tracker',
  '/medcard',
  '/icon.svg',
  '/manifest.json'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(PRECACHE);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(e) {
  // Only handle GET requests
  if (e.request.method !== 'GET') return;

  // API calls — network only, no cache
  if (e.request.url.includes('/counsel') ||
      e.request.url.includes('/interactions') ||
      e.request.url.includes('/check-symptoms') ||
      e.request.url.includes('/translate')) {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then(function(response) {
        // Cache fresh responses
        var clone = response.clone();
        caches.open(CACHE).then(function(cache) {
          cache.put(e.request, clone);
        });
        return response;
      })
      .catch(function() {
        // Serve from cache when offline
        return caches.match(e.request).then(function(cached) {
          if (cached) return cached;
          // For navigation requests, serve the app shell
          if (e.request.mode === 'navigate') {
            return caches.match('/app');
          }
        });
      })
  );
});
