import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// Mock getSupabaseAdmin before importing the module under test
vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: vi.fn(),
}))

// Import after mocks are set up
await import('@/lib/supabase/admin')

// Helper to create a minimal NextRequest-like object
function createMockRequest(headers: Record<string, string>, pathname = '/api/email'): NextRequest {
  const url = new URL(`http://localhost${pathname}`)
  return {
    headers: new Map(Object.entries(headers)) as unknown as Headers,
    nextUrl: url,
  } as unknown as NextRequest
}

describe('getClientIp', () => {
  let getClientIp: (request: NextRequest) => string

  beforeAll(async () => {
    // Dynamic import to avoid hoisting issues with vi.mock
    const mod = await import('@/lib/middleware/rateLimit')
    getClientIp = mod.getClientIp
  })

  it('returns real-ip when x-real-ip header is present', () => {
    const req = createMockRequest({ 'x-real-ip': '192.168.1.1' })
    expect(getClientIp(req)).toBe('192.168.1.1')
  })

  it('returns the first IP from x-forwarded-for when x-real-ip is absent', () => {
    const req = createMockRequest({ 'x-forwarded-for': '203.0.113.5, 198.51.100.2, 10.0.0.1' })
    expect(getClientIp(req)).toBe('203.0.113.5')
  })

  it('prefers x-real-ip over x-forwarded-for', () => {
    const req = createMockRequest({
      'x-real-ip': '10.0.0.42',
      'x-forwarded-for': '203.0.113.5, 198.51.100.2',
    })
    expect(getClientIp(req)).toBe('10.0.0.42')
  })

  it('trims whitespace from forwarded IPs', () => {
    const req = createMockRequest({ 'x-forwarded-for': '  203.0.113.5 , 198.51.100.2' })
    expect(getClientIp(req)).toBe('203.0.113.5')
  })

  it('returns "unknown" when no IP headers are present', () => {
    const req = createMockRequest({})
    expect(getClientIp(req)).toBe('unknown')
  })
})

describe('applyRateLimit', () => {
  let applyRateLimit: (request: NextRequest) => Promise<NextResponse | null>

  beforeAll(async () => {
    const mod = await import('@/lib/middleware/rateLimit')
    applyRateLimit = mod.applyRateLimit
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null for routes not in the rate-limit map', async () => {
    const req = createMockRequest({ 'x-real-ip': '1.2.3.4' }, '/api/unknown')
    const result = await applyRateLimit(req)
    expect(result).toBeNull()
  })

  it('returns null for non-api routes', async () => {
    const req = createMockRequest({}, '/')
    const result = await applyRateLimit(req)
    expect(result).toBeNull()
  })

  it('returns null for static assets', async () => {
    const req = createMockRequest({}, '/_next/static/chunk.js')
    const result = await applyRateLimit(req)
    expect(result).toBeNull()
  })

  it('matches prefix routes (e.g. /api/email/send matches /api/email)', async () => {
    const req = createMockRequest({ 'x-real-ip': '1.2.3.4' }, '/api/email/send')
    const result = await applyRateLimit(req)
    // Should not be null because /api/email is a configured route prefix
    expect(result).not.toBeNull()
  })
})
