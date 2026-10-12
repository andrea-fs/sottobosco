// Offline shell + push notifications.
const CACHE = 'nido-v4';
const SHELL = [
  './', './index.html', './hub.js', './hub.css', './forest.html', './app.css', './app.js', './forest-boot.js',
  './books.html', './books.css', './books.js', './core/base.css', './core/core.js', './config.js', './vendor/supabase.js',
  './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

// Network first, so updates arrive as soon as they are published; cache when offline.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('./index.html')))
  );
});

self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { title: 'Nido', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Nido', {
    body: d.body || '',
    tag: d.tag,
    renotify: true,
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    // only our own pages (relative paths such as "books.html#b=…"), never another site
    data: { url: typeof d.url === 'string' && /^[a-z0-9._\-]*\.html(#[a-z0-9=\-]*)?$/i.test(d.url) ? d.url : './' },
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const target = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) { if ('navigate' in c && 'focus' in c) return c.navigate(target).then((w) => (w || c).focus()); }
    return self.clients.openWindow(target);
  }));
});
