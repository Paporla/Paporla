'use client'

import { useEffect, useState } from 'react'
import Script from 'next/script'
import { CONSENT_CHANGED_EVENT, hasAnalyticsConsent } from '@/lib/utils/cookieConsent'

const GTM_ID = 'GTM-MKZBFF58'

/**
 * GTM condicionado al consentimiento de cookies (Ley 21.719: la analítica
 * necesita base de licitud; aquí es consentimiento explícito del banner).
 *
 * Antes cargaba incondicionalmente al montar. Ahora:
 *  - Sin decisión o con rechazo: no se inyecta NADA (ni el <noscript>, que
 *    también dispara una petición a Google).
 *  - Al aceptar en el banner, se carga al momento vía el evento
 *    'paporla-consent-changed', sin recargar la página.
 *
 * Revocar (pasar de aceptado a rechazado) sí requiere recargar para que el
 * script ya inyectado desaparezca; la política de cookies lo explica.
 */
export default function GoogleTagManager({ nonce }: { nonce?: string }) {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    setEnabled(hasAnalyticsConsent())

    const onChange = () => setEnabled(hasAnalyticsConsent())
    window.addEventListener(CONSENT_CHANGED_EVENT, onChange)
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, onChange)
  }, [])

  if (!enabled) return null

  return (
    <>
      {/* Script principal de GTM */}
      <Script
        id="gtm-script"
        strategy="afterInteractive"
        nonce={nonce}
        dangerouslySetInnerHTML={{
          __html: `
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${GTM_ID}');
          `,
        }}
      />
      {/* Fallback para navegadores sin JavaScript.
          Nota: sin JS no hay forma de consentir, así que este iframe solo
          existe dentro del componente ya condicionado; un navegador sin JS
          nunca lo recibe porque el propio componente no se hidrata. */}
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
          height="0"
          width="0"
          style={{ display: 'none', visibility: 'hidden' }}
        />
      </noscript>
    </>
  )
}
