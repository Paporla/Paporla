'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Cookie } from 'lucide-react'
import { getStoredConsent, storeConsent } from '@/lib/utils/cookieConsent'

/**
 * Banner de consentimiento de cookies de analítica.
 *
 * Diseño de mínimos honesto: dos botones con el mismo peso visual
 * («Solo esenciales» no está escondido ni en gris claro — los dark patterns
 * de consentimiento son exactamente lo que SERNAC persigue) y un enlace a la
 * política. No bloquea la navegación: quien lo ignora navega sin analítica,
 * que es el equivalente a rechazar.
 *
 * Se monta tras la hidratación (useEffect) para no discrepar con el SSR:
 * el servidor no conoce localStorage, así que siempre renderiza sin banner
 * y es el cliente quien decide mostrarlo.
 */
export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (getStoredConsent() === null) setVisible(true)
  }, [])

  if (!visible) return null

  const decide = (value: 'accepted' | 'rejected') => {
    storeConsent(value)
    setVisible(false)
  }

  return (
    <div role="region" aria-label="Preferencias de cookies" className="fixed bottom-0 inset-x-0 z-[90] p-4 sm:p-6">
      <div className="mx-auto max-w-2xl rounded-2xl border dark:border-white/10 border-gray-200 dark:bg-black/90 bg-white shadow-2xl backdrop-blur-md p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-primary/10 shrink-0">
            <Cookie className="w-5 h-5 text-primary" />
          </div>
          <div className="space-y-3 min-w-0">
            <p className="text-sm dark:text-gray-200 text-gray-800">
              Usamos cookies esenciales para que Paporla funcione. Si nos lo permites, también usaremos cookies de
              analítica (Google Analytics) para entender cómo se usa la app y mejorarla. Puedes cambiar de opinión
              cuando quieras en{' '}
              <Link href="/legal/cookies" className="text-primary underline underline-offset-2">
                nuestra política de cookies
              </Link>
              .
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => decide('accepted')}
                className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-white dark:text-black text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Aceptar analítica
              </button>
              <button
                type="button"
                onClick={() => decide('rejected')}
                className="flex-1 px-4 py-2.5 rounded-xl border dark:border-white/20 border-gray-300 dark:text-gray-200 text-gray-700 text-sm font-semibold dark:hover:bg-white/5 hover:bg-gray-50 transition-colors"
              >
                Solo esenciales
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
