import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { mockRpc, mockLoggerError } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
  mockLoggerError: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({ rpc: mockRpc }),
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: mockLoggerError },
}))

import { applyRateLimit, getClientIp } from '@/lib/middleware/rateLimit'

function createRequest(pathname: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(`https://preview.paporla.test${pathname}`, { headers })
}

function allowResponse(remaining = 4) {
  return {
    data: {
      allowed: true,
      limit: 5,
      remaining,
      reset_at: new Date(Date.now() + 60_000).toISOString(),
      blocked_until: null,
    },
    error: null,
  }
}

describe('getClientIp', () => {
  it('returns x-real-ip when present', () => {
    const request = createRequest('/api/auth', {
      'x-real-ip': '192.168.1.1',
      'x-forwarded-for': '203.0.113.5, 198.51.100.2',
    })

    expect(getClientIp(request)).toBe('192.168.1.1')
  })

  it('returns the first forwarded IP and trims whitespace', () => {
    const request = createRequest('/api/auth', {
      'x-forwarded-for': ' 203.0.113.5, 198.51.100.2',
    })

    expect(getClientIp(request)).toBe('203.0.113.5')
  })

  it('sin cabeceras de proxy, cada petición recibe su propio identificador anónimo (no un cubo global)', () => {
    // Antes devolvía 'unknown' para TODOS: un atacante podía agotar ese cubo
    // compartido y denegar el servicio al resto (S1, auditoría 2026-09-01).
    const first = getClientIp(createRequest('/api/auth'))
    const second = getClientIp(createRequest('/api/auth'))

    expect(first).toMatch(/^anon:/)
    expect(second).toMatch(/^anon:/)
    expect(first).not.toBe(second)
  })

  it('usa x-vercel-id como identificador anónimo cuando existe', () => {
    const request = createRequest('/api/auth', { 'x-vercel-id': 'iad1::abc123' })
    expect(getClientIp(request)).toBe('anon:iad1::abc123')
  })
})

describe('applyRateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRpc.mockResolvedValue(allowResponse())
  })

  it('ignores routes outside the configured API map', async () => {
    const response = await applyRateLimit(createRequest('/api/unknown'))

    expect(response).toBeNull()
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('uses the atomic canonical service RPC with privacy-preserving hashes', async () => {
    const response = await applyRateLimit(createRequest('/api/auth', { 'x-real-ip': '203.0.113.9' }))

    expect(response?.status).toBe(200)
    expect(response?.headers.get('X-RateLimit-Limit')).toBe('5')
    expect(response?.headers.get('X-RateLimit-Remaining')).toBe('4')
    expect(mockRpc).toHaveBeenCalledWith(
      'service_check_rate_limit',
      expect.objectContaining({
        p_scope: 'ip',
        p_action: '/api/auth',
        p_limit: 5,
        p_window_seconds: 60,
        p_block_seconds: 0,
      }),
    )

    const args = mockRpc.mock.calls[0][1] as { p_key_hash: string; p_identifier_hash: string }
    expect(args.p_key_hash).toMatch(/^\\x[0-9a-f]{64}$/)
    expect(args.p_identifier_hash).toMatch(/^\\x[0-9a-f]{64}$/)
    expect(JSON.stringify(args)).not.toContain('203.0.113.9')
  })

  it('matches configured route prefixes', async () => {
    await applyRateLimit(createRequest('/api/auth/session', { 'x-real-ip': '203.0.113.10' }))

    expect(mockRpc).toHaveBeenCalledWith('service_check_rate_limit', expect.objectContaining({ p_action: '/api/auth' }))
  })

  it('returns 429 with rate-limit headers when the RPC denies the request', async () => {
    const resetAt = new Date(Date.now() + 30_000).toISOString()
    mockRpc.mockResolvedValue({
      data: { allowed: false, limit: 5, remaining: 0, reset_at: resetAt, blocked_until: resetAt },
      error: null,
    })

    const response = await applyRateLimit(createRequest('/api/auth', { 'x-real-ip': '203.0.113.11' }))
    const body = await response?.json()

    expect(response?.status).toBe(429)
    expect(response?.headers.get('X-RateLimit-Remaining')).toBe('0')
    expect(Number(response?.headers.get('Retry-After'))).toBeGreaterThan(0)
    expect(body.error).toMatch(/Demasiadas solicitudes/)
  })

  it('fails open and logs when the service RPC is unavailable', async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error('RPC unavailable') })

    const response = await applyRateLimit(createRequest('/api/auth', { 'x-real-ip': '203.0.113.12' }))

    expect(response).toBeNull()
    expect(mockLoggerError).toHaveBeenCalledWith('RateLimit service_check_rate_limit', expect.any(Error))
  })

  it('fails open and logs an invalid RPC response', async () => {
    mockRpc.mockResolvedValue({ data: { allowed: true }, error: null })

    const response = await applyRateLimit(createRequest('/api/auth', { 'x-real-ip': '203.0.113.13' }))

    expect(response).toBeNull()
    expect(mockLoggerError).toHaveBeenCalled()
  })
})
