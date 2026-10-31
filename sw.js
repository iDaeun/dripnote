// 오프라인에서도 앱이 열리도록 앱 파일을 캐시한다.
// 온라인이면 항상 새 파일을 받아오고, 실패할 때만 캐시를 쓴다.
const CACHE = 'dripnote-v4';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './db.js',
  './flavors.js',
  './manifest.webmanifest',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  event.respondWith(
    // no-cache: 브라우저 HTTP 캐시에 옛 파일이 있어도 서버에 새 버전이 있는지 확인한다.
    fetch(req, { cache: 'no-cache' })
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(cache => cache.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req).then(hit => hit || caches.match('./index.html'))),
  );
});
