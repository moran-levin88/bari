const CACHE_VERSION = 'bari-v5'
const STATIC_CACHE = `${CACHE_VERSION}-static`

// Static assets safe to cache (no user data)
const CACHEABLE_PREFIXES = ['/_next/static/', '/icon-', '/apple-touch-icon', '/manifest.json']

function isCacheableAsset(url) {
  const path = new URL(url).pathname
  return CACHEABLE_PREFIXES.some((prefix) => path.startsWith(prefix))
}

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only cache static assets — never cache HTML pages (authenticated content)
  if (request.method !== 'GET') return
  if (url.pathname.startsWith('/api/')) return

  if (isCacheableAsset(request.url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          if (cached) return cached
          return fetch(request).then((res) => {
            cache.put(request, res.clone())
            return res
          })
        })
      )
    )
    return
  }

  // All other requests (pages, dynamic content) — network only, no cache
  // This prevents stale authenticated HTML from persisting after logout
})

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('push', (event) => {
  if (!event.data) return
  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'Bari', body: event.data.text() }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Bari', {
      body: payload.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: payload.url || '/' },
      dir: 'rtl',
      lang: 'he',
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      return clients.openWindow(url)
    })
  )
})
