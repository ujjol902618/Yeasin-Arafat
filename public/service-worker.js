// Service Worker for Yeasin Arafat Portfolio & CMS PWA
const CACHE_NAME = 'yeasin-portfolio-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/admin.html',
  '/login.html',
  '/manifest.json',
  '/public/icon.svg',
  '/icon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/css/style.css',
  '/css/admin.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Failed to precache some static assets:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Do not cache Firebase API / Auth / Firestore / Cloud requests
  if (
    url.origin.includes('googleapis.com') ||
    url.origin.includes('firebase') ||
    url.origin.includes('google') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  // Network first for HTML navigation, falling back to cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          return caches.match('/index.html');
        })
    );
    return;
  }

  // Cache-first / stale-while-revalidate for assets
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
