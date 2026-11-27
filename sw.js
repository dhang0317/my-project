const CACHE_NAME = 'atelier-de-lecture-v3';
const PRECACHE_URLS = [
  './',
  './index.html',
  './css/styles.css?v=8',
  './js/french-analyzer.js?v=9',
  './js/app.js?v=10',
  './js/firebase-sync.js?v=1',
  './data/library.json',
  './manifest.webmanifest',
  './icons/icon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Let API requests go straight to network (fallback to cached library.json for /api/library when offline)
  if (url.pathname.includes('/api/')) {
    if (url.pathname.endsWith('/api/library')) {
      event.respondWith(
        fetch(request).catch(() => caches.match('./data/library.json'))
      );
    }
    return;
  }

  // Network-first for HTML & library.json so updates arrive when online, with offline cache fallback
  if (request.mode === 'navigate' || url.pathname.endsWith('library.json')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(() =>
          caches.match(request, { ignoreSearch: true }).then(
            cached => cached || caches.match('./index.html')
          )
        )
    );
    return;
  }

  // Cache-first for static assets (CSS, JS, icons, manifest)
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
