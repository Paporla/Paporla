/**
 * Consentimiento de cookies de analítica.
 *
 * Chile hoy no exige un banner tipo europeo, pero la Ley 21.719 (vigencia
 * 1-dic-2026) exige una base de licitud para tratar datos con fines de
 * analítica, y la base natural es el consentimiento. Este módulo lo gestiona
 * con la política de mínimos honesta del proyecto:
 *
 *  - Las cookies TÉCNICAS (sesión de Supabase, csrf_token, preferencia de
 *    tema) no requieren consentimiento: sin ellas la app no funciona.
 *  - Las de ANALÍTICA (GTM/GA4) solo se cargan si el usuario acepta.
 *    Rechazar no degrada nada: la app funciona igual.
 *
 * La decisión se guarda en localStorage (mismo patrón que paporla-theme):
 * es una preferencia del navegador, no un dato del perfil. Versionada por si
 * algún día cambia el alcance de lo que se consiente (habría que volver a
 * preguntar).
 *
 * Módulo puro sin React para poder testearlo sin renderizar; el estado
 * reactivo vive en el banner y en los componentes que lo consultan vía el
 * evento 'paporla-consent-changed'.
 */

export type CookieConsent = 'accepted' | 'rejected'

const STORAGE_KEY = 'paporla-cookie-consent'

/** Versión del texto/alcance consentido. Si cambia, se vuelve a preguntar. */
const CONSENT_VERSION = '1'

/** Evento emitido en window al aceptar/rechazar, para reaccionar sin recargar. */
export const CONSENT_CHANGED_EVENT = 'paporla-consent-changed'

/**
 * Lee la decisión guardada, o `null` si aún no la hay (o es de una versión
 * anterior y hay que volver a preguntar). Seguro en SSR: devuelve null.
 */
export function getStoredConsent(): CookieConsent | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { version?: string; value?: string } | null
    if (parsed?.version !== CONSENT_VERSION) return null
    return parsed.value === 'accepted' || parsed.value === 'rejected' ? parsed.value : null
  } catch {
    // localStorage bloqueado (modo privado estricto) o JSON corrupto:
    // se comporta como "sin decidir" y el banner vuelve a preguntar.
    return null
  }
}

/** Guarda la decisión y avisa a los componentes montados. */
export function storeConsent(value: CookieConsent): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: CONSENT_VERSION, value, decidedAt: new Date().toISOString() }),
    )
  } catch {
    // Sin localStorage la decisión vale solo para esta página. Mejor eso que
    // romper el flujo del usuario.
  }
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT, { detail: value }))
}

/** ¿Hay consentimiento vigente para cargar analítica? */
export function hasAnalyticsConsent(): boolean {
  return getStoredConsent() === 'accepted'
}
