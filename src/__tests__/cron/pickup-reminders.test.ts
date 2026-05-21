import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/email', () => ({
  sendPickupReminderEmail: vi.fn().mockResolvedValue({ success: true }),
}))

const mockFrom = vi.fn()
const mockSelect = vi.fn().mockReturnThis()
const mockIn = vi.fn().mockReturnThis()
const mockEq = vi.fn().mockReturnThis()
const mockOrder = vi.fn().mockReturnThis()
const mockMaybeSingle = vi.fn()
const mockInsert = vi.fn().mockReturnThis()

const mockSupabase = {
  from: (table: string) => {
    mockFrom(table)
    return {
      select: mockSelect,
      insert: mockInsert,
    }
  },
}

const mockCreateClient = vi.fn(() => mockSupabase)

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mockCreateClient(),
}))

describe('GET /api/cron/pickup-reminders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    process.env.CRON_SECRET = 'test-secret'

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

  it('allows request when CRON_SECRET is not set', async () => {
    delete process.env.CRON_SECRET
    mockOrder.mockResolvedValue({ data: [], error: null })

    const { GET } = await import('@/app/api/cron/pickup-reminders/route')
    const request = new Request('http://localhost/api/cron/pickup-reminders')
    const response = await GET(request)
    expect(response.status).toBe(200)
  })
})
