import { describe, it, expect } from 'vitest'
import { buildCspHeader, generateNonce } from '@/lib/middleware/csp'

function directive(header: string, name: string): string {
  const d = header.split(';').find((part) => part.trim().startsWith(name))
  if (!d) throw new Error(`Directiva ${name} no encontrada`)
  return d
}

describe('CSP buildCspHeader (f8.5 S7)', () => {
  const header = buildCspHeader('nonce123')

  it('script-src NO permite scripts de *.supabase.co (la SDK va bundled)', () => {
    const scriptSrc = directive(header, 'script-src')
    expect(scriptSrc).not.toContain('supabase')
    expect(scriptSrc).toContain("'self'")
    expect(scriptSrc).toContain("'nonce-nonce123'")
    // GTM sigue permitida (es el unico script externo real de la app)
    expect(scriptSrc).toContain('https://www.googletagmanager.com')
    expect(scriptSrc).toContain('https://www.google-analytics.com')
  })

  it('connect-src sigue permitiendo fetch a supabase (PostgREST)', () => {
    expect(directive(header, 'connect-src')).toContain('https://*.supabase.co')
  })

  it('img-src sigue abierto a https (buckets publicos de storage)', () => {
    expect(directive(header, 'img-src')).toContain('https:')
  })

  it('mantene el resto de la politica de seguridad', () => {
    expect(directive(header, 'default-src')).toContain("'self'")
    expect(directive(header, 'frame-ancestors')).toContain("'none'")
    expect(directive(header, 'base-uri')).toContain("'self'")
    expect(directive(header, 'form-action')).toContain("'self'")
    expect(directive(header, 'style-src')).toContain("'nonce-nonce123'")
  })

  it('nonce generado: unico y base64', () => {
    const a = generateNonce()
    const b = generateNonce()
    expect(a).not.toBe(b)
    expect(a).toMatch(/^[A-Za-z0-9+/]+={0,2}$/)
    expect(a.length).toBeGreaterThanOrEqual(16)
  })
})
