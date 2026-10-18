// Offline play for Operasi Gagak. The build (scripts/build.mjs) fills in the
// file list and a version hashed from the published files, so every deploy
// gets a fresh cache and old ones are deleted. Unbuilt (the dev server), the
// version stays 'dev' and the worker passes every request through.
const VERSION = /*@VERSION@*/'dev';
const FILES = /*@FILES@*/[];
const CACHE = 'crow-zero-' + VERSION;

self.addEventListener('install', event => {
  if (VERSION === 'dev') return self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('crow-zero-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (VERSION === 'dev' || request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;
  // Pages: the network first, so a new deploy shows up; offline, the cache.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => { const copy = response.clone(); caches.open(CACHE).then(c => c.put(request, copy)); return response; })
      .catch(() => caches.match(request, { ignoreSearch: true }).then(hit => hit || caches.match('./'))));
    return;
  }
  // Scripts, models, textures: the cache first (the ?v= tags change with the
  // files, and each deploy has its own cache), filled in as they load.
  event.respondWith(caches.match(request, { ignoreSearch: true }).then(hit => hit || fetch(request).then(response => {
    if (response.ok) { const copy = response.clone(); caches.open(CACHE).then(c => c.put(request, copy)); }
    return response;
  })));
});
