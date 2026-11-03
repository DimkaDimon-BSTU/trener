// Подход Тренер: офлайн-кэш.
// Есть интернет — берём свежую версию файлов (обновления применяются сразу).
// Нет интернета или он еле живой — через 3 секунды отдаём сохранённую копию.
const CACHE = 'trener-v1';
const ASSETS = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
const TIMEOUT = 3000;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('trener-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // Open Food Facts и прочее — напрямую в сеть

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = (await cache.match(req, { ignoreSearch: true }))
      || (req.mode === 'navigate' ? await cache.match('./') : undefined);

    const net = fetch(req, { cache: 'no-cache' }).then(res => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    });
    e.waitUntil(net.then(() => {}, () => {}));

    if (!cached) return net;
    const timeout = new Promise(res => setTimeout(() => res(cached), TIMEOUT));
    return Promise.race([net.catch(() => cached), timeout]);
  })());
});
