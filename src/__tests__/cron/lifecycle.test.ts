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

const STEPS = [
  'service_open_pickup_windows',
  'service_mark_no_shows',
  'service_complete_picked_up_reservations',
  'service_expire_packs',
]

describe('GET /api/cron/lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    process.env.CRON_SECRET = 'test-secret'
  })

  it('returns 401 without valid auth header', async () => {
    const { GET } = await import('@/app/api/cron/lifecycle/route')
    const request = new Request('http://localhost/api/cron/lifecycle')
    const response = await GET(request)
    expect(response.status).toBe(401)
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('calls the four lifecycle RPCs in order with a valid secret', async () => {
    mockRpc.mockResolvedValue({ data: { success: true, processed: 0 }, error: null })

    const { GET } = await import('@/app/api/cron/lifecycle/route')
    const request = new Request('http://localhost/api/cron/lifecycle', {
      headers: { Authorization: 'Bearer test-secret' },
    })
    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(mockRpc.mock.calls.map((c) => c[0])).toEqual(STEPS)
  })

  it('reports processed counts per step', async () => {
    mockRpc
      .mockResolvedValueOnce({ data: { success: true, processed: 1 }, error: null })
      .mockResolvedValueOnce({ data: { success: true, processed: 2 }, error: null })
      .mockResolvedValueOnce({ data: { success: true, processed: 3 }, error: null })
      .mockResolvedValueOnce({ data: { success: true, processed: 4 }, error: null })

    const { GET } = await import('@/app/api/cron/lifecycle/route')
    const request = new Request('http://localhost/api/cron/lifecycle', {
      headers: { Authorization: 'Bearer test-secret' },
    })
    const response = await GET(request)
    const body = await response.json()

    expect(body.results.service_open_pickup_windows).toEqual({ processed: 1 })
    expect(body.results.service_mark_no_shows).toEqual({ processed: 2 })
    expect(body.results.service_complete_picked_up_reservations).toEqual({ processed: 3 })
    expect(body.results.service_expire_packs).toEqual({ processed: 4 })
  })

  it('continues with the remaining steps when one RPC fails and returns 500', async () => {
    mockRpc
      .mockResolvedValueOnce({ data: { success: true, processed: 0 }, error: null })
      .mockResolvedValueOnce({ data: null, error: new Error('boom') })
      .mockResolvedValueOnce({ data: { success: true, processed: 5 }, error: null })
      .mockResolvedValueOnce({ data: { success: true, processed: 1 }, error: null })

    const { GET } = await import('@/app/api/cron/lifecycle/route')
    const request = new Request('http://localhost/api/cron/lifecycle', {
      headers: { Authorization: 'Bearer test-secret' },
    })
    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.success).toBe(false)
    expect(body.results.service_mark_no_shows).toEqual({ error: 'boom' })
    expect(body.results.service_complete_picked_up_reservations).toEqual({ processed: 5 })
    expect(body.results.service_expire_packs).toEqual({ processed: 1 })
    expect(mockRpc).toHaveBeenCalledTimes(4)
  })

  it('treats a null RPC payload as zero processed', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null })

    const { GET } = await import('@/app/api/cron/lifecycle/route')
    const request = new Request('http://localhost/api/cron/lifecycle', {
      headers: { Authorization: 'Bearer test-secret' },
    })
    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.results.service_expire_packs).toEqual({ processed: 0 })
  })
})
