// SAREN Service Worker - v7
// Strategi: Cache-First untuk aset statis, Network-First+Cache untuk halaman HTML

const CACHE_VERSION = 'v8';
const STATIC_CACHE  = `saren-static-${CACHE_VERSION}`;
const PAGES_CACHE   = `saren-pages-${CACHE_VERSION}`;

// Aset statis yang selalu di-cache saat install
const STATIC_ASSETS = [
  '/offline.html',
  '/manifest.json',
  '/saren_logo.png',
  '/saren_logo_dark.png',
  '/saren_logo_light.png',
];

// ── Install: cache semua aset statis ──────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate: hapus cache lama ────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== PAGES_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: strategi caching cerdas ────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Abaikan request non-GET dan request ke domain lain (Supabase, dll)
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // Di mode development, abaikan intercept fetch agar tidak merusak HMR
  if (self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1' || self.location.hostname === '0.0.0.0') {
    return;
  }

  // Aset statis Next.js (_next/static): Cache-First
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Aset publik (gambar, manifest, dll): Cache-First
  if (
    url.pathname.startsWith('/saren_logo') ||
    url.pathname === '/manifest.json' ||
    url.pathname === '/offline.html'
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Halaman navigasi HTML: Network-First, fallback ke cache, lalu offline.html
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirstWithOfflineFallback(request));
    return;
  }

  // Semua request lain: Network-First dengan cache
  event.respondWith(networkFirstWithCache(request, STATIC_CACHE));
});

// ── Helper: Cache-First ───────────────────────────────────────────────────────
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('', { status: 503 });
  }
}

// ── Helper: Network-First dengan fallback ke offline.html ─────────────────────
async function networkFirstWithOfflineFallback(request) {
  const cache = await caches.open(PAGES_CACHE);

  try {
    // Online → ambil dari server (data fresh dari DB), simpan ke cache
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Offline → coba dari cache halaman dulu
    const cached = await cache.match(request);
    if (cached) return cached;

    // Tidak ada cache sama sekali → tampilkan halaman offline
    const staticCache = await caches.open(STATIC_CACHE);
    return staticCache.match('/offline.html');
  }
}

// ── Helper: Network-First dengan cache ───────────────────────────────────────
async function networkFirstWithCache(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('', { status: 503 });
  }
}

// ── Push Notification: web push event listeners ────────────────────────────────
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (err) {
    data = { title: 'SAREN Info', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'SAREN Info';
  const options = {
    body: data.body || '',
    icon: '/saren_logo.png',
    badge: '/saren_logo.png',
    data: { url: data.url || '/' }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      const targetUrl = event.notification.data.url || '/';
      // Coba cari tab yang sudah terbuka dengan URL yang sama dan fokuskan
      for (const client of clientList) {
        const clientUrl = new URL(client.url).pathname;
        const targetPath = new URL(targetUrl, self.location.origin).pathname;
        if (clientUrl === targetPath && 'focus' in client) {
          return client.focus();
        }
      }
      // Jika tidak ada tab terbuka, buka tab baru
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
