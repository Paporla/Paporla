'use client'

import { useEffect } from 'react'
import PWAInstallPrompt from '@/components/ui/PWAInstallPrompt'

export function PWAProvider() {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || process.env.NODE_ENV !== 'production') return

    const register = async () => {
      const registration = await navigator.serviceWorker.register('/sw.js').catch(() => null)
      if (!registration) return

      registration.addEventListener('updatefound', () => {
        const installing = registration.installing
        if (!installing) return
        installing.addEventListener('statechange', () => {
          if (installing.state === 'activated') {
            window.location.reload()
          }
        })
      })

      if (registration.waiting) {
        registration.waiting.addEventListener('statechange', () => {
          if (registration.waiting?.state === 'activated') {
            window.location.reload()
          }
        })
      }
    }

    window.addEventListener('load', register)
  }, [])

  return <PWAInstallPrompt />
}
