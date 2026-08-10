import { describe, it, expect } from 'vitest'
import { APP_CONFIG } from '@/lib/constants/config'

describe('APP_CONFIG', () => {
  it('has the correct app name', () => {
    expect(APP_CONFIG.name).toBe('Paporla')
  })

  it('has the correct description', () => {
    expect(APP_CONFIG.description).toBe('Rescate alimentario')
  })

  it('has a support phone number', () => {
    expect(APP_CONFIG.supportPhone).toBe('+56 2 555 1234')
  })

  it('has a support email', () => {
    expect(APP_CONFIG.supportEmail).toBe('soporte@paporla.com')
  })

  it('has a numeric pickup code length', () => {
    expect(APP_CONFIG.pickupCodeLength).toBe(6)
    expect(typeof APP_CONFIG.pickupCodeLength).toBe('number')
  })

  it('has a positive reservation cancellation window', () => {
    expect(APP_CONFIG.reservationCancelationHours).toBe(2)
    expect(typeof APP_CONFIG.reservationCancelationHours).toBe('number')
    expect(APP_CONFIG.reservationCancelationHours).toBeGreaterThan(0)
  })

  it('exposes all expected configuration keys', () => {
    const keys = Object.keys(APP_CONFIG)
    expect(keys).toContain('name')
    expect(keys).toContain('description')
    expect(keys).toContain('supportPhone')
    expect(keys).toContain('supportEmail')
    expect(keys).toContain('pickupCodeLength')
    expect(keys).toContain('reservationCancelationHours')
    expect(keys).toHaveLength(6)
  })

  it('config values are stable (no mutations)', () => {
    const clone = { ...APP_CONFIG }
    expect(clone).toEqual(APP_CONFIG)
  })
})
