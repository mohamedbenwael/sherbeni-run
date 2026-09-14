const CACHE_NAME = 'sherbeni-run-v2';
const CORE_ASSETS = [
  './',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // fonts, leaderboard API, etc. pass straight through

  // IMPORTANT: navigation requests (event.request) carry redirect:"manual" by spec.
  // If the server ever redirects (e.g. /index.html -> /), fetch(req) resolves to an
  // opaque "opaqueredirect" response that can't be used to respond to the page or be
  // cached, and causes ERR_FAILED. Building a fresh request with redirect:"follow"
  // avoids that entirely.
  const freshRequest = new Request(req.url, {
    method: 'GET',
    headers: req.headers,
    credentials: 'same-origin',
    redirect: 'follow'
  });

  event.respondWith(
    fetch(freshRequest)
      .then((networkRes) => {
        if (networkRes && networkRes.ok && networkRes.type === 'basic') {
          const clone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone)).catch(() => {});
        }
        return networkRes;
      })
      .catch(() =>
        caches.match(req).then((cached) => cached || caches.match('./'))
      )
  );
});
