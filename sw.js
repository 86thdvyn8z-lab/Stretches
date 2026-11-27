const CACHE = 'stretches-v8';
const LOCAL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'model.glb'];
const CDN = [
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
  'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js'
];

// Cache everything on install, skipping the browser's HTTP cache so a fresh upload is picked up.
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => Promise.all([
      ...LOCAL.map(u => fetch(new Request(u, { cache: 'reload' })).then(r => r.ok && c.put(u, r)).catch(() => {})),
      ...CDN.map(u => c.add(u).catch(() => {}))
    ]))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// App files: newest from the network when online, saved copy when offline.
// Libraries from CDNs never change, so they come straight from the cache.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const sameOrigin = new URL(e.request.url).origin === location.origin;
  e.respondWith(caches.open(CACHE).then(async c => {
    if (!sameOrigin) {
      const hit = await c.match(e.request);
      if (hit) return hit;
      const r = await fetch(e.request);
      if (r && (r.ok || r.type === 'opaque')) c.put(e.request, r.clone());
      return r;
    }
    try {
      const r = await fetch(e.request, { cache: 'no-store' });
      if (r && r.ok) c.put(e.request, r.clone());
      return r;
    } catch (err) {
      return (await c.match(e.request, { ignoreSearch: true })) ||
             (e.request.mode === 'navigate' ? c.match('index.html') : undefined);
    }
  }));
});
