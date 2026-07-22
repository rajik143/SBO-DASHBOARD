// public/sw.js — Real Background Notification Service Worker

const CACHE_NAME = 'sbo-dashboard-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install & Cache
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// Activate
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Fetch (offline support)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// 🔥 MAIN: Receive messages from App.tsx & show notification
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag, data } = event.data.payload;
    
    self.registration.showNotification(title, {
      body,
      tag: tag || 'sbo-update',
      icon: '/icon-192x192.png', // unga app icon path
      badge: '/badge-72x72.png',
      requireInteraction: false,
      silent: false,
      data: data || {},
      actions: data?.actions || [],
      vibrate: [200, 100, 200]
    });
  }
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing tab if open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({ type: 'NOTIFICATION_CLICKED', data: event.notification.data });
          return client.focus();
        }
      }
      // Open new tab if closed
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
