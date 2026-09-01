'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, XCircle } from 'lucide-react'
import { CONSENT_CHANGED_EVENT, getStoredConsent, storeConsent, type CookieConsent } from '@/lib/utils/cookieConsent'

/**
 * Panel de "cambiar mi decisión" de la página /legal/cookies.
 *
 * La política promete que se pueden gestionar las preferencias en cualquier
 * momento; este componente lo hace verdad. Muestra la decisión vigente y
 * permite cambiarla:
 *  - Rechazar → aceptar: la analítica se carga al momento (evento).
 *  - Aceptar → rechazar: el script de GA/GTM ya inyectado solo desaparece del
 *    todo al recargar; se avisa con honestidad y no se recarga por sorpresa.
 */
export default function CookieConsentManager() {
  const [consent, setConsent] = useState<CookieConsent | null>(null)
  const [mounted, setMounted] = useState(false)
  const [showReloadNote, setShowReloadNote] = useState(false)

  useEffect(() => {
    setMounted(true)
    setConsent(getStoredConsent())

    const onChange = () => setConsent(getStoredConsent())
    window.addEventListener(CONSENT_CHANGED_EVENT, onChange)
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, onChange)
  }, [])

  // Antes de la hidratación no se sabe la decisión: no pintar nada evita
  // discrepancias con el SSR.
  if (!mounted) return null

  const decide = (value: CookieConsent) => {
    const previous = consent
    storeConsent(value)
    setShowReloadNote(previous === 'accepted' && value === 'rejected')
  }

  const label =
    consent === 'accepted'
      ? 'Analítica activada'
      : consent === 'rejected'
        ? 'Solo cookies esenciales'
        : 'Aún no has decidido'

  return (
    <div className="mt-4 p-4 rounded-xl border dark:border-white/10 border-gray-200 dark:bg-white/5 bg-gray-50 space-y-3">
      <p className="text-sm dark:text-gray-300 text-gray-700">
        Tu decisión actual: <strong>{label}</strong>
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={() => decide('accepted')}
          disabled={consent === 'accepted'}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-white dark:text-black hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <CheckCircle className="w-4 h-4" /> Aceptar analítica
        </button>
        <button
          type="button"
          onClick={() => decide('rejected')}
          disabled={consent === 'rejected'}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border dark:border-white/20 border-gray-300 dark:text-gray-200 text-gray-700 dark:hover:bg-white/5 hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <XCircle className="w-4 h-4" /> Solo esenciales
        </button>
      </div>
      {showReloadNote && (
        <p className="text-xs dark:text-amber-400 text-amber-600">
          Guardado. Para que la analítica ya cargada desaparezca del todo, recarga la página.
        </p>
      )}
    </div>
  )
}
