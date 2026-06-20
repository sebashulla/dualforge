const CACHE = 'dualforge-v4';
const ASSETS = [
  '/manifest.webmanifest',
  '/branding/logo-icon.png',
  '/branding/logo-icon-32.png',
  '/branding/logo-icon-180.png',
  '/branding/logo-icon-192.png',
  '/branding/logo-icon-512.png',
  '/branding/logo-grande.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('dualforge-') && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const acceptsHtml = event.request.headers.get('accept')?.includes('text/html');

  if (event.request.mode === 'navigate' || acceptsHtml) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (url.origin === self.location.origin && ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;

        return fetch(event.request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, clone));
          return response;
        });
      }),
    );
  }
});
