// Firebase Messaging Service Worker
// This file handles background push notifications from Firebase Cloud Messaging.
// It must be placed in the root of the public directory for the browser to register it.

/* global importScripts, firebase */
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Initialize Firebase with your project config.
// These values should match your Firebase project settings.
firebase.initializeApp({
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
});

const messaging = firebase.messaging();

// Handle background messages (when tab is not focused or app is closed)
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'WhatsUp Alert';
  const body = payload.notification?.body || 'You have a new alert.';
  const icon = '/icons/icon-192x192.png';
  const topic = payload.data?.topic || '';

  const options = {
    body,
    icon,
    badge: '/icons/icon-72x72.png',
    tag: topic || 'whatsup-notification',
    data: { url: '/notifications', ...payload.data },
    actions: [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  self.registration.showNotification(title, options);
});

// Handle notification click — navigate to the relevant page
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/notifications';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus an existing window if available
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Otherwise open a new window
      return self.clients.openWindow(url);
    })
  );
});
