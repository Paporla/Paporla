'use client'

import { useEffect } from 'react'
import PWAInstallPrompt from '@/components/ui/PWAInstallPrompt'

export function PWAProvider() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {})
      })
    }
  }, [])

  return <PWAInstallPrompt />
}
