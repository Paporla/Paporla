import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => mockSupabase,
  validateCronRequest: (request: Request) => {
    const authHeader = request.headers.get('authorization')
    const secret = process.env.CRON_SECRET
    return !!(secret && authHeader === `Bearer ${secret}`)
  },
}))

// Fecha/hora fijas: "hoy" = 2026-08-28 y ahora = 12:00Z, que son las 08:00 de
// Santiago (UTC-4 en agosto). Evita que el test dependa de la fecha real.
const NOW = new Date('2026-08-28T12:00:00Z')

const todayReservation = {
  id: 'res-1',
  user_id: 'user-a',
  shop_id: 'shop-a',
  pack_id: 'pack-a',
  status: 'confirmed',
  pickup_start_at: '2026-08-28T15:00:00Z', // 11:00 h de Santiago
  pickup_end_at: '2026-08-28T22:00:00Z', // 18:00 h de Santiago
  pack_title_snapshot: 'Pack sorpresa',
  shop_name_snapshot: 'Panadería Staging A',
}

const tomorrowReservation = {
  ...todayReservation,
  id: 'res-2',
  pickup_start_at: '2026-08-29T15:00:00Z',
  pickup_end_at: '2026-08-29T22:00:00Z',
}

const yesterdayReservation = {
  ...todayReservation,
  id: 'res-3',
  pickup_start_at: '2026-08-27T15:00:00Z',
  pickup_end_at: '2026-08-27T22:00:00Z',
}

const mockInsert = vi.fn()
const mockFrom = vi.fn()
const mockSupabase = { from: mockFrom }

// Datos que devuelven los mocks; cada test los ajusta antes de llamar al GET.
let resRows: unknown[] = []
let resError: unknown = null
let shopRows: unknown[] = []
let dedupeExisting: { id: string } | null = null

const authorizedRequest = () =>
  new Request('http://localhost/api/cron/pickup-reminders', {
    headers: { Authorization: 'Bearer test-secret' },
  })

describe('GET /api/cron/pickup-reminders', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    vi.clearAllMocks()
    resRows = []
    resError = null
    shopRows = []
    dedupeExisting = null

    process.env.CRON_SECRET = 'test-secret'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'

    const reservationChain = {
      in: () => reservationChain,
      gte: () => reservationChain,
      order: () => reservationChain,
      limit: () => Promise.resolve({ data: resRows, error: resError }),
    }
    const shopChain = {
      in: () => Promise.resolve({ data: shopRows, error: null }),
    }
    const notificationQuery = {
      eq: () => notificationQuery,
      gte: () => notificationQuery,
      maybeSingle: () => Promise.resolve({ data: dedupeExisting, error: null }),
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'reservations') return { select: () => reservationChain }
      if (table === 'shops') return { select: () => shopChain }
      if (table === 'notifications') {
        return { select: () => notificationQuery, insert: mockInsert }
      }
      throw new Error(`tabla no esperada en el test: ${table}`)
    })
    mockInsert.mockResolvedValue({ data: null, error: null })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns 401 without valid auth header', async () => {
    const { GET } = await import('@/app/api/cron/pickup-reminders/route')
    const response = await GET(new Request('http://localhost/api/cron/pickup-reminders'))
    expect(response.status).toBe(401)
  })

  it('returns 401 with wrong auth header', async () => {
    const { GET } = await import('@/app/api/cron/pickup-reminders/route')
    const response = await GET(
      new Request('http://localhost/api/cron/pickup-reminders', {
        headers: { Authorization: 'Bearer wrong-secret' },
      }),
    )
    expect(response.status).toBe(401)
  })

  it('returns 401 when CRON_SECRET is not configured', async () => {
    delete process.env.CRON_SECRET
    const { GET } = await import('@/app/api/cron/pickup-reminders/route')
    const response = await GET(authorizedRequest())
    expect(response.status).toBe(401)
  })

  it('returns zeros when there are no reservations for today', async () => {
    resRows = []

    const { GET } = await import('@/app/api/cron/pickup-reminders/route')
    const response = await GET(authorizedRequest())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.user_reminders).toBe(0)
    expect(body.shop_reminders).toBe(0)
    expect(body.message).toBe('Sin recogidas para hoy')
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('notifies the client and the shop owner for a pickup today', async () => {
    resRows = [todayReservation]
    shopRows = [{ id: 'shop-a', owner_id: 'owner-a' }]

    const { GET } = await import('@/app/api/cron/pickup-reminders/route')
    const response = await GET(authorizedRequest())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.user_reminders).toBe(1)
    expect(body.shop_reminders).toBe(1)
    expect(mockInsert).toHaveBeenCalledTimes(2)

    // Notificación al cliente, con los campos canónicos de la tabla
    // notifications (0006): category + type + title + body + data + FKs.
    expect(mockInsert).toHaveBeenNthCalledWith(1, {
      user_id: 'user-a',
      category: 'pickup',
      type: 'pickup_reminder',
      title: 'Tu recogida de hoy: Pack sorpresa',
      body: 'Hoy recoges "Pack sorpresa" en Panadería Staging A (11:00–18:00, hora de Chile).',
      data: {
        reservation_id: 'res-1',
        pickup_start_at: '2026-08-28T15:00:00Z',
        pickup_end_at: '2026-08-28T22:00:00Z',
      },
      reservation_id: 'res-1',
      shop_id: 'shop-a',
      pack_id: 'pack-a',
    })

    // Notificación al dueño del comercio, con category de operaciones.
    expect(mockInsert).toHaveBeenNthCalledWith(2, {
      user_id: 'owner-a',
      category: 'shop_operations',
      type: 'pickup_reminder',
      title: 'Recogida de hoy: Pack sorpresa',
      body: 'Un cliente recogerá "Pack sorpresa" hoy (11:00–18:00, hora de Chile).',
      data: {
        reservation_id: 'res-1',
        pickup_start_at: '2026-08-28T15:00:00Z',
        pickup_end_at: '2026-08-28T22:00:00Z',
      },
      reservation_id: 'res-1',
      shop_id: 'shop-a',
      pack_id: 'pack-a',
    })
  })

  it('does not repeat a reminder already sent in the last 24 h', async () => {
    resRows = [todayReservation]
    shopRows = [{ id: 'shop-a', owner_id: 'owner-a' }]
    dedupeExisting = { id: 'notif-existente' }

    const { GET } = await import('@/app/api/cron/pickup-reminders/route')
    const response = await GET(authorizedRequest())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.user_reminders).toBe(0)
    expect(body.shop_reminders).toBe(0)
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('skips reservations from other days (yesterday and tomorrow)', async () => {
    resRows = [yesterdayReservation, todayReservation, tomorrowReservation]
    shopRows = [{ id: 'shop-a', owner_id: 'owner-a' }]

    const { GET } = await import('@/app/api/cron/pickup-reminders/route')
    const response = await GET(authorizedRequest())
    const body = await response.json()

    // Solo cuenta la de hoy (res-1); las de ayer y mañana se ignoran.
    expect(response.status).toBe(200)
    expect(body.user_reminders).toBe(1)
    expect(body.shop_reminders).toBe(1)
    expect(mockInsert).toHaveBeenCalledTimes(2)
  })

  it('notifies only the client when the shop has no owner', async () => {
    resRows = [todayReservation]
    shopRows = [{ id: 'shop-a', owner_id: null }]

    const { GET } = await import('@/app/api/cron/pickup-reminders/route')
    const response = await GET(authorizedRequest())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.user_reminders).toBe(1)
    expect(body.shop_reminders).toBe(0)
    expect(mockInsert).toHaveBeenCalledTimes(1)
  })

  it('returns 500 when the reservations query fails', async () => {
    resError = new Error('boom')

    const { GET } = await import('@/app/api/cron/pickup-reminders/route')
    const response = await GET(authorizedRequest())
    expect(response.status).toBe(500)
  })
})
