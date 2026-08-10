'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Download } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      const dismissed = localStorage.getItem('paporla-pwa-dismissed')
      if (!dismissed) {
        setTimeout(() => setShowPrompt(true), 3000)
      }
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShowPrompt(false)
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('paporla-pwa-dismissed', 'true')
  }

  if (!showPrompt || !deferredPrompt) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-4 left-4 right-4 z-[70] md:left-auto md:right-6 md:bottom-6 md:w-96"
      >
        <div className="dark:bg-gray-900 bg-white rounded-2xl border dark:border-white/10 border-gray-200 shadow-2xl p-5">
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 p-1 rounded-full dark:text-gray-400 text-gray-500 hover:text-primary transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Download className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="dark:text-white text-gray-900 font-semibold text-sm">Instala Paporla</h3>
              <p className="dark:text-gray-400 text-gray-600 text-xs">Acceso rapido desde tu pantalla de inicio</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleInstall}
              className="flex-1 py-2.5 rounded-full bg-primary text-black font-medium text-sm hover:bg-primary/90 transition-colors"
            >
              Instalar ahora
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2.5 rounded-full dark:bg-white/5 bg-gray-100 dark:text-gray-300 text-gray-600 text-sm hover:bg-primary/10 transition-colors"
            >
              Despues
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
