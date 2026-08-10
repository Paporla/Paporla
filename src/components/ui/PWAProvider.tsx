'use client'

import { useEffect } from 'react'
import PWAInstallPrompt from '@/components/ui/PWAInstallPrompt'

export function PWAProvider() {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || process.env.NODE_ENV !== 'production') return

    // Solo registrar si no hay un Service Worker activo — NO borrar caché ni desregistrar
    navigator.serviceWorker.getRegistration().then((registration) => {
      if (!registration) {
        // No hay SW registrado, crear uno nuevo
        navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(() => null)
      } else {
        // Ya hay uno activo, solo buscar actualizaciones
        registration.update()
      }
    })
  }, [])

  return <PWAInstallPrompt />
}
