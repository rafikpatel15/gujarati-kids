// Offline cache so the app works without internet once opened
const CACHE = 'guj-kids-v2';
const FILES = ['./', 'index.html', 'sentences.html', 'app.css', 'data.js', 'common.js', 'icon.svg', 'manifest.webmanifest'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const url = new URL(r.url);
  // never cache speech audio
  if (url.hostname.includes('translate.google.com')) return;
  e.respondWith(
    fetch(r).then(res => {
      if (res.ok && (url.origin === location.origin || url.hostname.includes('fonts.g'))) {
        const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy));
      }
      return res;
    }).catch(() => caches.match(r).then(m => m || caches.match('index.html')))
  );
});
