// Service Worker for Yeasin Arafat Portfolio & CMS PWA
const CACHE_NAME = 'yeasin-portfolio-v2';
const FIREBASE_IMAGE_CACHE = 'firebase-storage-images-v1';
const MAX_IMAGE_CACHE_ENTRIES = 120;

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

// Cache size limiter to prevent storage bloat
async function limitCacheSize(cacheName, maxEntries) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxEntries) {
      await cache.delete(keys[0]);
      limitCacheSize(cacheName, maxEntries);
    }
  } catch (err) {
    // Ignore cache trimming error
  }
}

// Helper to determine if a request is specifically an image asset from Firebase Storage
function isFirebaseStorageImageRequest(request, url) {
  if (request.method !== 'GET') return false;

  // Check if hostname or path matches Firebase Storage endpoints
  const isFirebaseStorage =
    url.hostname === 'firebasestorage.googleapis.com' ||
    url.hostname === 'storage.googleapis.com' ||
    url.hostname.endsWith('.firebasestorage.app') ||
    url.pathname.includes('/v0/b/');

  if (!isFirebaseStorage) return false;

  // Check if it's an image request
  const isImageDestination = request.destination === 'image';
  const hasImageExtension = /\.(jpe?g|png|webp|gif|svg|bmp|avif)(\?|$)/i.test(url.pathname);
  const hasMediaParam = url.searchParams.get('alt') === 'media';
  const acceptsImage = request.headers.get('accept')?.includes('image/');

  return isImageDestination || hasImageExtension || hasMediaParam || acceptsImage;
}

// Stale-While-Revalidate handler for image assets
async function handleStaleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  // Background fetch to revalidate and update cache
  const fetchPromise = fetch(request)
    .then(async (networkResponse) => {
      // Valid responses include 200 OK or opaque responses (status 0) from CORS image requests
      if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
        try {
          await cache.put(request, networkResponse.clone());
          limitCacheSize(cacheName, MAX_IMAGE_CACHE_ENTRIES);
        } catch (cacheErr) {
          console.warn('[SW] Could not put image in cache:', cacheErr);
        }
      }
      return networkResponse;
    })
    .catch((err) => {
      // Network failed or offline, return cached response if available
      return cachedResponse;
    });

  // Return cached response immediately for instant previews, falling back to network fetch
  return cachedResponse || fetchPromise;
}

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
      const allowedCaches = [CACHE_NAME, FIREBASE_IMAGE_CACHE];
      return Promise.all(
        keys
          .filter((key) => !allowedCaches.includes(key))
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. SPECIFIC FIREBASE STORAGE IMAGE ASSETS: Stale-While-Revalidate
  // Delivers instant previews from cache while revalidating and updating in background
  if (isFirebaseStorageImageRequest(event.request, url)) {
    event.respondWith(handleStaleWhileRevalidate(event.request, FIREBASE_IMAGE_CACHE));
    return;
  }

  // 2. EXCLUDE OTHER FIREBASE API / Auth / Firestore calls from caching
  if (
    url.origin.includes('googleapis.com') ||
    url.origin.includes('firebase') ||
    url.origin.includes('google') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  // 3. Network-first for HTML navigation, falling back to cache
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

  // 4. Cache-first / Stale-While-Revalidate for local static assets
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

