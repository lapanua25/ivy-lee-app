const CACHE_NAME = 'ivy-lee-cache-v1';
const urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // キャッシュに存在する場合はキャッシュを返す
        if (response) {
          return response;
        }
        // そうでなければネットワークリクエスト
        return fetch(event.request).catch(() => {
          // オフライン時にリクエスト失敗した場合は何もしない（画面は維持される）
          console.error('Offline fetch failed');
        });
      })
  );
});
