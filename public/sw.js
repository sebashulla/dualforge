const CACHE = 'dualforge-v1';
const ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/branding/logo-icon-32.png',
  '/branding/logo-icon-180.png',
  '/branding/logo-icon-192.png',
  '/branding/logo-icon-512.png',
  '/branding/logo-grande.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
    ),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request)),
  );
});
