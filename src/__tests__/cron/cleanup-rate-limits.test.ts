import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRpc = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({ rpc: mockRpc }),
  validateCronRequest: (request: Request) => {
    const authHeader = request.headers.get('authorization')
    const secret = process.env.CRON_SECRET
    return !!(secret && authHeader === `Bearer ${secret}`)
  },
}))

describe('GET /api/cron/cleanup-rate-limits', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    process.env.CRON_SECRET = 'test-secret'
  })

  it('returns 401 without valid auth header', async () => {
    const { GET } = await import('@/app/api/cron/cleanup-rate-limits/route')
    const request = new Request('http://localhost/api/cron/cleanup-rate-limits')
    const response = await GET(request)
    expect(response.status).toBe(401)
  })

  it('calls service_cleanup_rate_limits RPC with a valid secret', async () => {
    mockRpc.mockResolvedValue({ data: { success: true, processed: 3 }, error: null })

    const { GET } = await import('@/app/api/cron/cleanup-rate-limits/route')
    const request = new Request('http://localhost/api/cron/cleanup-rate-limits', {
      headers: { Authorization: 'Bearer test-secret' },
    })
    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.cleaned).toBe(3)
    expect(body.message).toContain('3 rate limits expirados')
    expect(mockRpc).toHaveBeenCalledWith('service_cleanup_rate_limits')
  })

  it('returns cleaned: 0 when there are no expired rows', async () => {
    mockRpc.mockResolvedValue({ data: { success: true, processed: 0 }, error: null })

    const { GET } = await import('@/app/api/cron/cleanup-rate-limits/route')
    const request = new Request('http://localhost/api/cron/cleanup-rate-limits', {
      headers: { Authorization: 'Bearer test-secret' },
    })
    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.cleaned).toBe(0)
    expect(body.message).toContain('0 rate limits expirados')
  })

  it('returns 500 on RPC error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error('RPC failed') })

    const { GET } = await import('@/app/api/cron/cleanup-rate-limits/route')
    const request = new Request('http://localhost/api/cron/cleanup-rate-limits', {
      headers: { Authorization: 'Bearer test-secret' },
    })
    const response = await GET(request)
    expect(response.status).toBe(500)
  })

  it('handles a null RPC result gracefully', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null })

    const { GET } = await import('@/app/api/cron/cleanup-rate-limits/route')
    const request = new Request('http://localhost/api/cron/cleanup-rate-limits', {
      headers: { Authorization: 'Bearer test-secret' },
    })
    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.cleaned).toBe(0)
  })
})
