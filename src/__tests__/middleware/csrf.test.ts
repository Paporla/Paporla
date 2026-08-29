import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { constantTimeEqual, validateCsrf } from '@/lib/middleware/csrf'

function reqWithTokens(method: string, cookieToken: string, headerToken: string): NextRequest {
  const headers: Record<string, string> = {}
  if (cookieToken) headers.cookie = `csrf_token=${cookieToken}`
  if (headerToken) headers['x-csrf-token'] = headerToken
  return new NextRequest(`https://preview.paporla.test/api/reservations`, { method, headers })
}

describe('constantTimeEqual (helper compartido CSRF + cron, f8.5 S5)', () => {
  it('iguales: true', () => {
    expect(constantTimeEqual('Bearer abc123', 'Bearer abc123')).toBe(true)
    expect(constantTimeEqual('', '')).toBe(true)
  })

  it('distintos: false (cualquier posicion)', () => {
    expect(constantTimeEqual('Bearer abc123', 'Bearer abc124')).toBe(false)
    expect(constantTimeEqual('Bearer abc123', 'Bearre abc123')).toBe(false)
    expect(constantTimeEqual('abc', 'abd')).toBe(false)
  })

  it('largo distinto: false (sin lanzar error)', () => {
    expect(constantTimeEqual('abc', 'abcd')).toBe(false)
    expect(constantTimeEqual('', 'x')).toBe(false)
  })
})

describe('validateCsrf (comportamiento intacto tras extraer el helper)', () => {
  it('GET no se valida', () => {
    expect(validateCsrf(reqWithTokens('GET', '', ''))).toBeNull()
  })

  it('sin token: 403', () => {
    const res = validateCsrf(reqWithTokens('POST', '', ''))
    expect(res?.status).toBe(403)
  })

  it('token valido (cookie + header iguales): pasa', () => {
    expect(validateCsrf(reqWithTokens('POST', 'tok123', 'tok123'))).toBeNull()
  })

  it('token invalido: 403', () => {
    const res = validateCsrf(reqWithTokens('POST', 'tok123', 'tok124'))
    expect(res?.status).toBe(403)
  })

  it('token de largo distinto: 403', () => {
    const res = validateCsrf(reqWithTokens('POST', 'tok123', 'tok1234'))
    expect(res?.status).toBe(403)
  })
})
