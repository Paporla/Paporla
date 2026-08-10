const CACHE_NAME = 'paporla-v2'
const STATIC_CACHE = 'paporla-static-v2'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME && key !== STATIC_CACHE).map((key) => caches.delete(key))),
      ),
  )
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)
  const isStatic =
    url.pathname.startsWith('/_next/static/') || url.pathname.match(/\.(js|css|woff2?|svg|png|jpg|webp|ico)$/)
  const isApi = url.pathname.startsWith('/api/')
  const isHtml = event.request.headers.get('accept')?.includes('text/html')

  if (isApi) {
    event.respondWith(
      fetch(event.request).catch(
        () =>
          new Response(JSON.stringify({ error: 'Sin conexion' }), {
            headers: { 'Content-Type': 'application/json' },
          }),
      ),
    )
    return
  }

  if (isStatic) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, clone))
          }
          return response
        })
      }),
    )
    return
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && isHtml) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() => {
        if (isHtml) {
          return caches.match(event.request).then((cached) => cached || caches.match('/'))
        }
        return caches.match(event.request)
      }),
  )
})

self.addEventListener('push', (event) => {
  if (!event.data) return

  try {
    const data = event.data.json()
    const options = {
      body: data.body || '',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      vibrate: [200, 100, 200],
      data: data.data || {},
      actions: data.actions || [],
    }

    event.waitUntil(self.registration.showNotification(data.title || 'Paporla', options))
  } catch (e) {
    console.error('Push error:', e)
  }
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const url = event.notification.data?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url)) {
          return client.focus()
        }
      }
      return self.clients.openWindow(url)
    }),
  )
})
