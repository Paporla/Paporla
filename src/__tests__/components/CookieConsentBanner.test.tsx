import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CookieConsentBanner from '@/components/CookieConsentBanner'
import { getStoredConsent, storeConsent } from '@/lib/utils/cookieConsent'

describe('CookieConsentBanner', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('aparece cuando no hay decisión guardada', () => {
    render(<CookieConsentBanner />)
    expect(screen.getByRole('region', { name: 'Preferencias de cookies' })).toBeInTheDocument()
    expect(screen.getByText('Aceptar analítica')).toBeInTheDocument()
    expect(screen.getByText('Solo esenciales')).toBeInTheDocument()
  })

  it('NO aparece si ya se decidió antes', () => {
    storeConsent('rejected')
    render(<CookieConsentBanner />)
    expect(screen.queryByRole('region', { name: 'Preferencias de cookies' })).not.toBeInTheDocument()
  })

  it('aceptar guarda la decisión y cierra el banner', () => {
    render(<CookieConsentBanner />)
    fireEvent.click(screen.getByText('Aceptar analítica'))
    expect(getStoredConsent()).toBe('accepted')
    expect(screen.queryByText('Aceptar analítica')).not.toBeInTheDocument()
  })

  it('rechazar guarda la decisión y cierra el banner', () => {
    render(<CookieConsentBanner />)
    fireEvent.click(screen.getByText('Solo esenciales'))
    expect(getStoredConsent()).toBe('rejected')
    expect(screen.queryByText('Solo esenciales')).not.toBeInTheDocument()
  })

  it('enlaza a la política de cookies', () => {
    render(<CookieConsentBanner />)
    const link = screen.getByRole('link', { name: /política de cookies/i })
    expect(link).toHaveAttribute('href', '/legal/cookies')
  })
})
