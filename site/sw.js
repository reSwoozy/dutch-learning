const VERSION = 'v11';
const STATIC_CACHE = `dutch-static-${VERSION}`;
const RUNTIME_CACHE = `dutch-runtime-${VERSION}`;

const STATIC_ASSETS = [
  './',
  './index.html',
  './css/base.css',
  './css/layout.css',
  './css/components.css',
  './css/pages.css',
  './js/main.js',
  './manifest.webmanifest',
  './icons/icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((k) => ![STATIC_CACHE, RUNTIME_CACHE].includes(k))
        .map((k) => caches.delete(k)),
    );
    await self.clients.claim();
    const windows = await self.clients.matchAll({ type: 'window' });
    for (const client of windows) {
      client.postMessage({ type: 'dutch-sw-activated', version: VERSION });
    }
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.endsWith('/index.html') || url.pathname === '/' || url.pathname.endsWith('/')) {
    event.respondWith(networkFirst(req));
    return;
  }

  if (url.pathname.includes('/data/') && url.pathname.endsWith('.json')) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  if (url.pathname.endsWith('.md') && url.pathname.includes('/data/')) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  event.respondWith(cacheFirst(req));
});

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  try {
    const fresh = await fetch(req);
    if (fresh.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(req, fresh.clone());
    }
    return fresh;
  } catch (err) {
    return cached || new Response('Offline', { status: 503 });
  }
}

async function networkFirst(req) {
  try {
    const fresh = await fetch(req);
    if (fresh.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(req, fresh.clone());
    }
    return fresh;
  } catch (err) {
    const cached = await caches.match(req);
    return cached || caches.match('./index.html');
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(req);
  const network = fetch(req).then((res) => {
    if (res.ok) cache.put(req, res.clone());
    return res;
  }).catch(() => null);
  return cached || network || new Response('Offline', { status: 503 });
}
