// push-sw.js — Neighborly morning-digest push worker.
// DELIBERATELY push-only: no `fetch` handler and no caching, so this
// service worker can never intercept navigations or serve stale assets
// (the dashboard actively unregisters caching SWs — this one is safe to keep).

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

// Show the notification pushed by the morning-digest Edge Function.
self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch (_) { payload = {}; }

  const title = payload.title || 'Neighborly — Yesterday';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icon-192.png',
    badge: payload.badge || '/favicon-32.png',
    tag: payload.tag || 'morning-digest',        // collapses duplicates
    renotify: true,
    data: { url: payload.url || '/neighborly-digest.html' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Tapping the notification opens (or focuses) the digest popup.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/neighborly-digest.html';
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if (c.url.includes('neighborly-digest') && 'focus' in c) return c.focus();
    }
    if (self.clients.openWindow) return self.clients.openWindow(target);
  })());
});
