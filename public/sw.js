const CACHE_VERSION = 'bari-v3'
const STATIC_CACHE = `${CACHE_VERSION}-static`

// On install — take control immediately
self.addEventListener('install', () => {
  self.skipWaiting()
})

// On activate — delete old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  )
})

// Fetch strategy
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET and API/auth requests — always go to network
  if (request.method !== 'GET') return
  if (url.pathname.startsWith('/api/')) return
  if (url.pathname.startsWith('/_next/')) {
    // Cache Next.js static chunks
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

  // Network-first for pages — always fresh content
  event.respondWith(
    fetch(request)
      .then((res) => {
        const clone = res.clone()
        caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone))
        return res
      })
      .catch(() => caches.match(request))
  )
})

// Notify clients when a new SW version takes over
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
})
