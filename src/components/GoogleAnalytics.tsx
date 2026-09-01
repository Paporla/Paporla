'use client'

import { useEffect, useState } from 'react'
import { GoogleAnalytics as NextGoogleAnalytics } from '@next/third-parties/google'
import { GA_MEASUREMENT_ID, isAnalyticsEnabled } from '@/lib/analytics'
import { CONSENT_CHANGED_EVENT, hasAnalyticsConsent } from '@/lib/utils/cookieConsent'

/**
 * GA4 condicionado al consentimiento del banner de cookies, con la misma
 * mecánica que GoogleTagManager: nada se carga sin aceptación y la aceptación
 * surte efecto al momento vía 'paporla-consent-changed'.
 */
export default function GoogleAnalytics() {
  const [consented, setConsented] = useState(false)

  useEffect(() => {
    setConsented(hasAnalyticsConsent())

    const onChange = () => setConsented(hasAnalyticsConsent())
    window.addEventListener(CONSENT_CHANGED_EVENT, onChange)
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, onChange)
  }, [])

  if (!isAnalyticsEnabled() || !consented) return null
  return <NextGoogleAnalytics gaId={GA_MEASUREMENT_ID} />
}
