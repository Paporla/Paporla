import { describe, it, expect, beforeEach } from 'vitest'
import { isUserOnboardingDismissed, dismissUserOnboarding } from '@/lib/utils/onboarding'

/**
 * Estado único del onboarding informativo del usuario (Lote E).
 *
 * Cierra el bug de la auditoría: antes OnboardingBanner y OnboardingSteps
 * usaban claves de localStorage distintas y descoordinadas. Ahora comparten
 * una sola, y las claves antiguas se respetan como "ya lo entendí".
 */
describe('onboarding (estado unificado)', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('usuario nuevo: el cartel se muestra (no está descartado)', () => {
    expect(isUserOnboardingDismissed()).toBe(false)
  })

  it('descartar una vez lo descarta en todas partes', () => {
    dismissUserOnboarding()
    expect(isUserOnboardingDismissed()).toBe(true)
  })

  it('respeta la clave legacy del banner del dashboard', () => {
    window.localStorage.setItem('paporla_onboarding_dismissed', 'true')
    expect(isUserOnboardingDismissed()).toBe(true)
  })

  it('respeta la clave legacy de los pasos del catálogo', () => {
    window.localStorage.setItem('paporla_onboarding_seen', 'true')
    expect(isUserOnboardingDismissed()).toBe(true)
  })

  it('el descarte nuevo escribe SU clave sin tocar las legacy', () => {
    dismissUserOnboarding()
    expect(window.localStorage.getItem('paporla_onboarding_user_dismissed')).toBe('true')
    expect(window.localStorage.getItem('paporla_onboarding_dismissed')).toBeNull()
    expect(window.localStorage.getItem('paporla_onboarding_seen')).toBeNull()
  })
})
