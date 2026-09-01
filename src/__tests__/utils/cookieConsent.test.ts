import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getStoredConsent, storeConsent, hasAnalyticsConsent, CONSENT_CHANGED_EVENT } from '@/lib/utils/cookieConsent'

const STORAGE_KEY = 'paporla-cookie-consent'

describe('cookieConsent', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('sin nada guardado devuelve null (el banner debe preguntar)', () => {
    expect(getStoredConsent()).toBeNull()
    expect(hasAnalyticsConsent()).toBe(false)
  })

  it('guarda y lee la aceptación', () => {
    storeConsent('accepted')
    expect(getStoredConsent()).toBe('accepted')
    expect(hasAnalyticsConsent()).toBe(true)
  })

  it('guarda y lee el rechazo', () => {
    storeConsent('rejected')
    expect(getStoredConsent()).toBe('rejected')
    expect(hasAnalyticsConsent()).toBe(false)
  })

  it('emite el evento de cambio al decidir', () => {
    const listener = vi.fn()
    window.addEventListener(CONSENT_CHANGED_EVENT, listener)
    storeConsent('accepted')
    expect(listener).toHaveBeenCalledTimes(1)
    window.removeEventListener(CONSENT_CHANGED_EVENT, listener)
  })

  it('ignora un valor guardado corrupto', () => {
    window.localStorage.setItem(STORAGE_KEY, 'no-es-json{{{')
    expect(getStoredConsent()).toBeNull()
  })

  it('ignora una versión de consentimiento distinta (hay que volver a preguntar)', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: '0', value: 'accepted' }))
    expect(getStoredConsent()).toBeNull()
  })

  it('ignora un value desconocido', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: '1', value: 'quizas' }))
    expect(getStoredConsent()).toBeNull()
  })

  it('la decisión incluye la fecha (evidencia de cuándo se consintió)', () => {
    storeConsent('accepted')
    const raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!)
    expect(raw.decidedAt).toBeTruthy()
    expect(new Date(raw.decidedAt).getTime()).not.toBeNaN()
  })
})
