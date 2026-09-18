'use client'

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

type BIPEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * Boton "Descarga la app" para la landing.
 *
 * Por que existe: el banner nativo (y el PWAInstallPrompt propio) solo
 * aparecen cuando el navegador decide ofrecerlos, y a veces tarda minutos.
 * Este boton esta siempre: si el evento del sistema ya paso, lo dispara;
 * si no (o en iPhone, que no permite dispararlo), abre dos lineas de
 * instrucciones manuales. Si la app ya esta instalada, no pinta nada.
 */
export default function InstallAppButton() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [installed, setInstalled] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(display-mode: standalone)').matches
      : false,
  )

  useEffect(() => {
    const onBIP = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BIPEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setShowHelp(false)
    }
    window.addEventListener('beforeinstallprompt', onBIP)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBIP)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed) return null

  const onClick = async () => {
    if (deferred) {
      await deferred.prompt()
      const choice = await deferred.userChoice
      if (choice.outcome === 'accepted') setInstalled(true)
      setDeferred(null)
    } else {
      setShowHelp(true)
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full border border-primary/40 text-gray-900 dark:text-white font-medium hover:bg-primary/10 transition"
      >
        <Download className="w-4 h-4 text-primary" />
        Descarga la app
      </button>
      {showHelp && (
        <div className="max-w-sm text-left text-sm text-gray-600 dark:text-gray-300 bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl p-4 relative">
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => setShowHelp(false)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-4 h-4" />
          </button>
          <p className="font-semibold mb-2 text-gray-900 dark:text-white">Instálala en 10 segundos:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>
              <span className="font-medium">Android / Chrome:</span> menú ⋮ → «Instalar aplicación».
            </li>
            <li>
              <span className="font-medium">iPhone / Safari:</span> botón compartir → «Añadir a pantalla de inicio».
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}
