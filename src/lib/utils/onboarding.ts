/**
 * Estado único del onboarding informativo del USUARIO (Lote E simplificación UX).
 *
 * Antes había dos claves de localStorage descoordinadas contando la misma
 * historia ("explora → reserva → recoge"):
 *   - 'paporla_onboarding_dismissed' (OnboardingBanner del dashboard),
 *     además COMPARTIDA con la variante de comercio: cerrar una ocultaba
 *     la otra (bug de la auditoría externa).
 *   - 'paporla_onboarding_seen' (OnboardingSteps del catálogo): cerrarla en
 *     el catálogo no la cerraba en el dashboard y la explicación perseguía
 *     al usuario.
 *
 * Ahora hay una sola fuente de verdad: entendida la historia en un sitio,
 * entendida en todos. (El comercio ya no participa: su onboarding real es
 * el checklist «Primeros pasos», que se deriva de datos vivos y no guarda
 * nada en localStorage.)
 *
 * Las claves antiguas se siguen leyendo como "ya lo entendí" para no volver
 * a enseñar el cartel a quien lo cerró antes de este cambio.
 */

const STORAGE_KEY = 'paporla_onboarding_user_dismissed'

/** Claves previas a este cambio, que valen como descarte ya hecho. */
const LEGACY_KEYS = ['paporla_onboarding_dismissed', 'paporla_onboarding_seen']

export function isUserOnboardingDismissed(): boolean {
  if (typeof window === 'undefined') return true
  try {
    if (window.localStorage.getItem(STORAGE_KEY)) return true
    return LEGACY_KEYS.some((key) => window.localStorage.getItem(key))
  } catch {
    // Sin storage (Safari privado, cuotas): mejor no perseguir al usuario
    // con un cartel que reaparecería en cada página.
    return true
  }
}

export function dismissUserOnboarding(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, 'true')
  } catch {
    /* sin storage: el cartel volverá en la próxima sesión, nada que romper */
  }
}
