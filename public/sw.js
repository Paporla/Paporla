const CACHE_NAME = 'paporla-v5'
const STATIC_CACHE = 'paporla-static-v5'

// Respuesta de emergencia cuando no hay red NI cache: evita el TypeError
// "Failed to convert value to 'Response'" (respondWith con undefined).
function offlineFallback(isHtml) {
  if (isHtml) {
    return new Response(
      '<!doctype html><html lang="es"><meta charset="utf-8"><title>Sin conexion - Paporla</title>' +
        '<body style="font-family:system-ui;text-align:center;padding:3rem 1rem;background:#0a0a1a;color:#fff">' +
        '<h1>Sin conexion</h1><p>Revisa tu conexion a internet e intentalo de nuevo.</p></body></html>',
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    )
  }
  return new Response('', { status: 504, statusText: 'Offline' })
}

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  // Al activar un worker NUEVO (o sea, un deploy nuevo) se borra TAMBIEN el
  // cache de HTML (CACHE_NAME). Motivo: las paginas cacheadas viven en la
  // misma url ('/') entre deployments; si un toque de red fallaba, el worker
  // servia HTML de un build viejo mezclado con la vida nueva: destellos,
  // saltos y sensacion de version vieja contra nueva en el movil.
  // STATIC_CACHE se conserva: sus urls llevan hash de contenido y nunca
  // mienten sobre su version. Sin cache de HTML, offline sigue teniendo
  // pagina de cortesia (offlineFallback) y los assets ya visitados.
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key)))),
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
            status: 503,
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
        return fetch(event.request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone()
              caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, clone))
            }
            return response
          })
          .catch(() => offlineFallback(false))
      }),
    )
    return
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && isHtml) {
          // Hardening: NUNCA cachear HTML de zonas privadas. En un dispositivo
          // compartido, el cache offline podría servir el panel de una sesión
          // anterior (hallazgo auditoría sw.js).
          const url = new URL(event.request.url)
          const isPrivate =
            /^\/(dashboard|admin|business|profile|reservations|favorites|notifications|settings)(\/|$)/.test(
              url.pathname,
            )
          if (!isPrivate) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          }
        }
        return response
      })
      .catch(() =>
        caches
          .match(event.request)
          .then((cached) => cached || (isHtml ? caches.match('/') : undefined))
          .then((cached) => cached || offlineFallback(isHtml)),
      ),
  )
})

self.addEventListener('push', (event) => {
  if (!event.data) return

  try {
    const data = event.data.json()
    const options = {
      body: data.body || '',
      icon: '/favicon/icon-192.png?v=2',
      badge: '/favicon/favicon-96x96.png?v=2',
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
