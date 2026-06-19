import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/email', () => ({
  sendPickupReminderEmail: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => mockSupabase,
  validateCronRequest: (request: Request) => {
    const authHeader = request.headers.get('authorization')
    const secret = process.env.CRON_SECRET
    return !!(secret && authHeader === `Bearer ${secret}`)
  },
}))

const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockIn = vi.fn()
const mockEq = vi.fn()
const mockOrder = vi.fn()
const mockMaybeSingle = vi.fn()
const mockInsert = vi.fn()

const mockSupabase = {
  from: mockFrom,
  channel: vi.fn(),
}

describe('GET /api/cron/pickup-reminders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    process.env.CRON_SECRET = 'test-secret'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'

    mockFrom.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
    })
    mockSelect.mockReturnValue({
      in: mockIn,
      eq: mockEq,
      order: mockOrder,
    })
    mockIn.mockReturnValue({
      eq: mockEq,
      order: mockOrder,
    })
    mockEq.mockReturnValue({
      eq: mockEq,
      order: mockOrder,
      maybeSingle: mockMaybeSingle,
      insert: mockInsert,
    })
    mockOrder.mockResolvedValue({ data: [], error: null })
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
    mockInsert.mockResolvedValue({ data: null, error: null })
  })

  it('returns 401 without valid auth header', async () => {
    const { GET } = await import('@/app/api/cron/pickup-reminders/route')
    const request = new Request('http://localhost/api/cron/pickup-reminders')
    const response = await GET(request)
    expect(response.status).toBe(401)
  })

  it('returns 401 with wrong auth header', async () => {
    const { GET } = await import('@/app/api/cron/pickup-reminders/route')
    const request = new Request('http://localhost/api/cron/pickup-reminders', {
      headers: { Authorization: 'Bearer wrong-secret' },
    })
    const response = await GET(request)
    expect(response.status).toBe(401)
  })

  it('returns zero when no reservations for today', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null })

    const { GET } = await import('@/app/api/cron/pickup-reminders/route')
    const request = new Request('http://localhost/api/cron/pickup-reminders', {
      headers: { Authorization: 'Bearer test-secret' },
    })
    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.sent).toBe(0)
  })

  it('denies request when CRON_SECRET is not set (security fix)', async () => {
    delete process.env.CRON_SECRET

    const { GET } = await import('@/app/api/cron/pickup-reminders/route')
    const request = new Request('http://localhost/api/cron/pickup-reminders')
    const response = await GET(request)
    expect(response.status).toBe(401)
  })
})
