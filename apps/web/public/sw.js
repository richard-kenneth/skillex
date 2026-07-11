const CACHE_NAME = 'skilex-cache-v1';
const OFFLINE_URL = '/offline.html';

// Assets to pre-cache on install
const PRECACHE_ASSETS = [
  OFFLINE_URL,
  '/favicon.ico',
  '/icon.svg',
  '/icon-maskable.svg',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching offline fallback and assets');
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 1. Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // 2. Skip API calls, internal next.js endpoints, hot reloading, auth endpoints, or livekit rooms
  if (
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/_next') ||
    url.pathname.includes('/room/') ||
    url.pathname.includes('webpack') ||
    url.pathname.includes('__nextjs') ||
    url.hostname.includes('livekit') ||
    url.hostname.includes('flutterwave')
  ) {
    // Network-only
    return;
  }

  // 3. Page requests (HTML document navigate requests)
  if (request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // If successful, clone and store in cache
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Network failed, look in cache
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // If not in cache, return the offline fallback HTML
            return caches.match(OFFLINE_URL);
          });
        })
    );
    return;
  }

  // 4. Static assets (images, CSS, JS, fonts)
  // Caching Strategy: Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch background update
        fetch(request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, networkResponse);
              });
            }
          })
          .catch((err) => console.log('[Service Worker] Background fetch failed for:', request.url, err));
        
        return cachedResponse;
      }

      // If not cached, fetch from network and store
      return fetch(request).then((networkResponse) => {
        if (networkResponse.status === 200 || networkResponse.status === 0) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      });
    })
  );
});

// Handle background Web Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) {
    console.log('[Service Worker] Push event received with no data');
    return;
  }

  try {
    const data = event.data.json();
    const notification = data.notification;
    const title = notification.title || 'Skill Exchange';
    const options = {
      body: notification.body || '',
      icon: notification.icon || '/icon-192.png',
      badge: notification.badge || '/icon-192.png',
      data: notification.data || { url: '/' },
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (err) {
    console.error('[Service Worker] Error displaying push notification:', err);
  }
});

// Handle notification click (redirect to app pages)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window open with this app
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then(() => client.navigate(urlToOpen));
        }
      }
      // If not, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

