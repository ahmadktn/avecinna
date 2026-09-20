/**
 * Avecinna Service Worker (`sw.js`)
 * Implements Offline PWA Shell Caching, API Interception, and Background Sync API Handlers
 */

const CACHE_NAME = 'avecinna-v1-shell'
const PRECACHE_ASSETS = [
  '/',
  '/login',
  '/avecinna%20icon.png',
]

// 1. Install Event: Pre-cache clinical shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.warn('[ServiceWorker] Pre-cache skipped or partial:', err)
        return self.skipWaiting()
      })
  )
})

// 2. Activate Event: Purge older cache versions and claim immediate client control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      })
      .then(() => self.clients.claim())
  )
})

// 3. Fetch Event: Intercept network requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // API Requests Interception (/api/v1/*) — only intercept GET requests for offline caching
  if (url.pathname.startsWith('/api/v1/')) {
    if (event.request.method !== 'GET') {
      // Pass-through: Do not intercept mutating requests (POST, PATCH, PUT, DELETE)
      return
    }

    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // Network failure for GET: return structured offline response
          return new Response(
            JSON.stringify({
              error: 'NETWORK_OFFLINE',
              isOffline: true,
              message: 'Clinical workstation is operating offline. Accessing encrypted local cache.',
            }),
            {
              status: 503,
              statusText: 'Service Unavailable (Offline)',
              headers: {
                'Content-Type': 'application/json',
                'X-Avecinna-Offline': 'true',
              },
            }
          )
        })
    )
    return
  }

  // Navigation & Static Assets: Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch fresh copy in background
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse))
            }
          })
          .catch(() => {})
        return cachedResponse
      }

      return fetch(event.request).catch(() => {
        // Fallback for HTML navigations
        if (event.request.mode === 'navigate') {
          return caches.match('/') || caches.match('/login')
        }
      })
    })
  )
})

// 4. Background Sync API Handlers
self.addEventListener('sync', (event) => {
  if (event.tag === 'avecinna-sync-audit-branch' || event.tag === 'avecinna-sync') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clientList) => {
        for (const client of clientList) {
          client.postMessage({
            type: 'TRIGGER_OFFLINE_SYNC',
            tag: event.tag,
          })
        }
      })
    )
  }
})

// 5. Message listener from active window clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
