// Service Worker para Notificaciones Web Push de MeltyDeays Wired Club (v2026)
const CACHE_NAME = 'wired-club-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Recepción de eventos push en segundo plano
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'MeltyDeays Wired Club', body: event.data.text() };
    }
  }

  const title = data.title || '⚡ MeltyDeays · The Wired Club';
  const options = {
    body: data.body || '¡Nuevas recompensas y descuentos gaming disponibles en tu club!',
    icon: data.icon || 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=192&q=80',
    badge: data.badge || 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=96&q=80',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      rewardId: data.rewardId || null
    },
    tag: data.tag || 'wired-club-notif',
    renotify: true
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Clic en la notificación en Google Chrome (Móvil o Escritorio)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const rewardId = event.notification.data?.rewardId;
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if (rewardId && client.postMessage) {
            client.postMessage({ type: 'OPEN_REWARD_MODAL', rewardId });
          }
          return client.focus();
        }
      }
      const fullUrl = rewardId ? `${targetUrl}${targetUrl.includes('?') ? '&' : '?'}openReward=${rewardId}` : targetUrl;
      if (clients.openWindow) {
        return clients.openWindow(fullUrl);
      }
    })
  );
});
