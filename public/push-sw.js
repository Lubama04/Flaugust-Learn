// Gestion des notifications push, importée par le service worker généré par vite-plugin-pwa
// (workbox.importScripts). Un seul service worker est enregistré pour toute l'application.
self.addEventListener('push', (event) => {
  if (!event.data) return

  let data
  try {
    data = event.data.json()
  } catch {
    data = { title: 'FlaugustLearn', body: event.data.text() }
  }

  const options = {
    body: data.body || '',
    icon: '/logo-192.png',
    badge: '/logo-72.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/', notificationId: data.notificationId },
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false,
    tag: data.tag || 'flaugustlearn',
  }

  event.waitUntil(self.registration.showNotification(data.title || 'FlaugustLearn', options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === target && 'focus' in client) return client.focus()
      }
      for (const client of clientList) {
        if ('navigate' in client && 'focus' in client) {
          return client.navigate(target).then((c) => c && c.focus())
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target)
    })
  )
})
