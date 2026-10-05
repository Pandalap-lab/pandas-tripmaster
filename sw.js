const CACHE = 'tripmaster-v23-github';

const SHELL = [
  './',
  './?app=23',
  './manifest.webmanifest',
  './route-map.js?v=23',
  './regularity.js?v=23',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', event =>
  event.waitUntil(
    Promise.all([
      caches.open(CACHE).then(cache => cache.addAll(SHELL)),
      self.skipWaiting()
    ])
  )
);

self.addEventListener('activate', event =>
  event.waitUntil(
    Promise.all([
      caches.keys().then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE)
            .map(key => caches.delete(key))
        )
      ),
      self.clients.claim()
    ])
  )
);

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  // Online map tiles use the browser HTTP cache, never the offline app shell.
  if (new URL(event.request.url).origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put('./?app=23', copy));
          return response;
        })
        .catch(() => caches.match('./?app=23'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached =>
      cached ||
      fetch(event.request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, copy));
        }
        return response;
      })
    )
  );
});

