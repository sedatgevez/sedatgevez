/* SedoX Service Worker — arka plan bildirimleri */
const CACHE = 'sedox-v1';
const PRECACHE = ['./', './index.html', './SedoX-Borsa-Takip.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE).catch(() => {})).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  // API / borsa isteklerini cache'leme
  const url = req.url || '';
  if (/okx\.com|mexc\.com|formsubmit|\/api\//i.test(url)) return;
  event.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).catch(() => caches.match('./index.html')))
  );
});

/** Sayfadan veya push'tan gelen bildirimi göster */
async function showSedoxNotification(data) {
  const title = (data && data.title) || 'SedoX Alarm';
  const body = (data && data.body) || '';
  const tag = (data && data.tag) || 'sedox-alert';
  const url = (data && data.url) || './';
  const opts = {
    body,
    tag,
    renotify: true,
    requireInteraction: !!(data && data.requireInteraction !== false),
    silent: false,
    vibrate: [180, 80, 180, 80, 320],
    data: { url, symbol: data && data.symbol, price: data && data.price },
    badge: undefined,
    icon: undefined,
    actions: [
      { action: 'open', title: 'Aç' },
      { action: 'dismiss', title: 'Kapat' },
    ],
  };
  try {
    await self.registration.showNotification(title, opts);
  } catch (e) {
    // actions desteklenmeyen ortam
    delete opts.actions;
    await self.registration.showNotification(title, opts);
  }
}

self.addEventListener('message', (event) => {
  const msg = event.data || {};
  if (msg.type === 'SHOW_NOTIFICATION') {
    event.waitUntil(showSedoxNotification(msg.payload || {}));
  }
  if (msg.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    try { data = { body: event.data && event.data.text() }; } catch (e2) {}
  }
  event.waitUntil(showSedoxNotification({
    title: data.title || 'SedoX Alarm',
    body: data.body || data.message || 'Fiyat alarmı tetiklendi',
    tag: data.tag || ('sedox-push-' + Date.now()),
    url: data.url || './',
    symbol: data.symbol,
    price: data.price,
    requireInteraction: true,
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  const target = (event.notification.data && event.notification.data.url) || './';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) {
          c.postMessage({ type: 'NOTIFICATION_CLICK', data: event.notification.data });
          return c.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});
