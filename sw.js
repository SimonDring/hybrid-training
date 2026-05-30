/* =============================================================
   Hybrid Training Plan — Service Worker
   =============================================================
   STRATEGY
   - Versioned cache name: bump CACHE_VERSION on each deploy to
     force-invalidate clients.
   - Network-first for navigation requests (index.html) so updates
     are picked up within the session. Falls back to cache offline.
   - Cache-first for static assets (manifest, icons, future assets).
   - Skip waiting + claim on install/activate so updates apply fast.
   ============================================================= */

const CACHE_VERSION = 'v5-2026-05-24';
const CACHE_NAME = `hybrid-cache-${CACHE_VERSION}`;

// Resources to pre-cache on install. Keep this list minimal —
// everything else is cached on first request.
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon.svg'
];

// ---------- INSTALL ----------
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Use addAll but tolerate individual failures (e.g. an icon not yet uploaded)
    await Promise.all(PRECACHE_URLS.map(async (url) => {
      try { await cache.add(url); } catch (e) { /* tolerate missing optional assets */ }
    }));
    // Apply this SW immediately on first install
    await self.skipWaiting();
  })());
});

// ---------- ACTIVATE — clean up old caches ----------
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(k => k.startsWith('hybrid-cache-') && k !== CACHE_NAME)
          .map(k => caches.delete(k))
    );
    // Take control of all open clients immediately
    await self.clients.claim();
  })());
});

// ---------- FETCH ----------
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GET — let the browser handle other methods
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Don't try to cache cross-origin requests (no opaque-cache surprises)
  if (url.origin !== self.location.origin) return;

  // Navigation requests → network-first, fallback to cache
  if (req.mode === 'navigate' ||
      (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(networkFirst(req));
    return;
  }

  // Everything else → cache-first
  event.respondWith(cacheFirst(req));
});

async function networkFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const fresh = await fetch(req);
    // Successful response → store a copy
    if (fresh && fresh.status === 200) cache.put(req, fresh.clone());
    return fresh;
  } catch (err) {
    // Offline / network failure → serve cache
    const cached = await cache.match(req);
    if (cached) return cached;
    // Final fallback: serve cached index.html (single-page app, all routes resolve here)
    const indexFallback = await cache.match('./index.html');
    if (indexFallback) return indexFallback;
    throw err;
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const fresh = await fetch(req);
    if (fresh && fresh.status === 200) cache.put(req, fresh.clone());
    return fresh;
  } catch (err) {
    // Nothing in cache, network failed — let it fail
    throw err;
  }
}

// ---------- MESSAGE HANDLER — for in-app commands ----------
self.addEventListener('message', (event) => {
  if (!event.data) return;

  // Manual update trigger from the app
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  // Clear all caches (used by app's "Reset all data" flow)
  if (event.data.type === 'CLEAR_CACHES') {
    event.waitUntil((async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
      if (event.source) event.source.postMessage({ type: 'CACHES_CLEARED' });
    })());
  }
});
