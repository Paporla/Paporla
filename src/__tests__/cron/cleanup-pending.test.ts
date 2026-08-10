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

describe('GET /api/cron/cleanup-pending', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    process.env.CRON_SECRET = 'test-secret'
  })

  it('returns 401 without auth header', async () => {
    const { GET } = await import('@/app/api/cron/cleanup-pending/route')
    const request = new Request('http://localhost/api/cron/cleanup-pending')
    const response = await GET(request)
    expect(response.status).toBe(401)
  })

  it('returns 401 with wrong auth header', async () => {
    const { GET } = await import('@/app/api/cron/cleanup-pending/route')
    const request = new Request('http://localhost/api/cron/cleanup-pending', {
      headers: { Authorization: 'Bearer wrong-secret' },
    })
    const response = await GET(request)
    expect(response.status).toBe(401)
  })

  it('returns 401 when CRON_SECRET is not configured', async () => {
    delete process.env.CRON_SECRET
    const { GET } = await import('@/app/api/cron/cleanup-pending/route')
    const request = new Request('http://localhost/api/cron/cleanup-pending', {
      headers: { Authorization: 'Bearer test-secret' },
    })
    const response = await GET(request)
    expect(response.status).toBe(401)
  })

  it('calls cleanup_pending_reservations RPC with p_minutes_ago: 30 and valid secret', async () => {
    mockRpc.mockResolvedValue({ data: { success: true, cleaned_count: 5 }, error: null })

    const { GET } = await import('@/app/api/cron/cleanup-pending/route')
    const request = new Request('http://localhost/api/cron/cleanup-pending', {
      headers: { Authorization: 'Bearer test-secret' },
    })
    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.cleaned).toBe(5)
    expect(mockRpc).toHaveBeenCalledWith('cleanup_pending_reservations', {
      p_minutes_ago: 30,
    })
  })

  it('returns cleaned: 0 when no pending reservations exist', async () => {
    mockRpc.mockResolvedValue({ data: { success: true, cleaned_count: 0 }, error: null })

    const { GET } = await import('@/app/api/cron/cleanup-pending/route')
    const request = new Request('http://localhost/api/cron/cleanup-pending', {
      headers: { Authorization: 'Bearer test-secret' },
    })
    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.cleaned).toBe(0)
    expect(body.message).toContain('0 reservas')
  })

  it('returns 500 on RPC error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error('RPC connection failed') })

    const { GET } = await import('@/app/api/cron/cleanup-pending/route')
    const request = new Request('http://localhost/api/cron/cleanup-pending', {
      headers: { Authorization: 'Bearer test-secret' },
    })
    const response = await GET(request)
    expect(response.status).toBe(500)
  })

  it('handles null RPC result gracefully', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null })

    const { GET } = await import('@/app/api/cron/cleanup-pending/route')
    const request = new Request('http://localhost/api/cron/cleanup-pending', {
      headers: { Authorization: 'Bearer test-secret' },
    })
    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.cleaned).toBe(0)
  })
})
