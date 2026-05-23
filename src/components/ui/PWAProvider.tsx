'use client'

import { useEffect } from 'react'
import PWAInstallPrompt from '@/components/ui/PWAInstallPrompt'

export function PWAProvider() {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || process.env.NODE_ENV !== 'production') return
    ;(async () => {
      const registrations = await navigator.serviceWorker.getRegistrations()
      for (const reg of registrations) {
        await reg.unregister()
      }

      const cacheKeys = await caches.keys()
      for (const key of cacheKeys) {
        await caches.delete(key)
      }

      const registration = await navigator.serviceWorker
        .register('/sw.js', { updateViaCache: 'none' })
        .catch(() => null)
      if (!registration) return

      if (registration.active) {
        registration.addEventListener('updatefound', () => {
          registration.installing?.addEventListener('statechange', () => {
            if (registration.installing?.state === 'activated') {
              window.location.reload()
            }
          })
        })

        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload()
        })
      }
    })()
  }, [])

  return <PWAInstallPrompt />
}
