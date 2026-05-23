import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRpc = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({ rpc: mockRpc }),
  validateCronRequest: (request: Request) => {
    const authHeader = request.headers.get('authorization')
    const secret = process.env.CRON_SECRET
    return !!(secret && authHeader === 'Bearer ' + secret)
  },
}))

describe('GET /api/cron/expire-reservations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    process.env.CRON_SECRET = 'test-secret'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
  })

  it('returns 401 without valid auth header', async () => {
    const { GET } = await import('@/app/api/cron/expire-reservations/route')
    const request = new Request('http://localhost/api/cron/expire-reservations')
    const response = await GET(request)
    expect(response.status).toBe(401)
  })

  it('returns 401 with wrong auth header', async () => {
    const { GET } = await import('@/app/api/cron/expire-reservations/route')
    const request = new Request('http://localhost/api/cron/expire-reservations', {
      headers: { Authorization: 'Bearer wrong-secret' },
    })
    const response = await GET(request)
    expect(response.status).toBe(401)
  })

  it('calls expire_reservations RPC with valid secret', async () => {
    mockRpc.mockResolvedValue({
      data: { expired_reservations: 3, expired_packs: 1, sold_out_packs: 2 },
      error: null,
    })

    const { GET } = await import('@/app/api/cron/expire-reservations/route')
    const request = new Request('http://localhost/api/cron/expire-reservations', {
      headers: { Authorization: 'Bearer test-secret' },
    })
    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.expired_reservations).toBe(3)
    expect(body.expired_packs).toBe(1)
    expect(body.sold_out_packs).toBe(2)
    expect(mockRpc).toHaveBeenCalledWith('expire_reservations')
  })

  it('returns zero counts when no data', async () => {
    mockRpc.mockResolvedValue({ data: {}, error: null })

    const { GET } = await import('@/app/api/cron/expire-reservations/route')
    const request = new Request('http://localhost/api/cron/expire-reservations', {
      headers: { Authorization: 'Bearer test-secret' },
    })
    const response = await GET(request)
    const body = await response.json()

    expect(body.success).toBe(true)
    expect(body.expired_reservations).toBe(0)
    expect(body.expired_packs).toBe(0)
    expect(body.sold_out_packs).toBe(0)
  })

  it('returns 500 on RPC error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error('RPC failed') })

    const { GET } = await import('@/app/api/cron/expire-reservations/route')
    const request = new Request('http://localhost/api/cron/expire-reservations', {
      headers: { Authorization: 'Bearer test-secret' },
    })
    const response = await GET(request)
    expect(response.status).toBe(500)
  })

  it('denies request when CRON_SECRET is not set (security fix)', async () => {
    delete process.env.CRON_SECRET

    const { GET } = await import('@/app/api/cron/expire-reservations/route')
    const request = new Request('http://localhost/api/cron/expire-reservations')
    const response = await GET(request)
    expect(response.status).toBe(401)
  })
})
