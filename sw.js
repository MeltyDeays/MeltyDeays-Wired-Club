// Service Worker Oficial PWA & Web Push de MeltyDeays Wired Club (v2.9.88)
const CACHE_NAME = 'wired-club-v2.9.88';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './admin.html',
  './manifest.webmanifest',
  './styles.css',
  './css/core.css',
  './css/client.css',
  './css/responsive.css',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon.svg',
  './assets/icons/apple-touch-icon.png'
];

// 1. Instalación y precaching del shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Aviso precaching no-crítico:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// 2. Activación y purga de versiones anteriores de caché
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Interceptor Fetch (Criterio obligatorio Chromium PWA + Resiliencia Offline)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignorar métodos no GET
  if (event.request.method !== 'GET') return;

  // Ignorar extensiones de navegador y esquemas no HTTP(S)
  if (!url.protocol.startsWith('http')) return;

  // Dejar pasar libremente peticiones a APIs dinámicas y servicios de Firebase
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('firebaseinstallations.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.pathname.startsWith('/api/')
  ) {
    return;
  }

  // Estrategia Network-First con fallback a CacheStorage local
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});

// 4. Recepción de eventos push en segundo plano
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
    icon: data.icon || './assets/icons/icon-192.png',
    badge: data.badge || './assets/icons/icon-192.png',
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

// 5. Clic en notificación
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
