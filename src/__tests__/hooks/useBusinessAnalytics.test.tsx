import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useBusinessAnalytics } from '@/components/business/analytics/useBusinessAnalytics'
import { supabaseBrowser } from '@/lib/supabase/client'
import { dateKeyInTimezone } from '@/lib/utils/formatDate'

const state = vi.hoisted(() => ({
  user: { id: 'owner-a' },
  realDateKey: null as unknown,
}))

const mockUseAuth = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/useAuth', () => ({
  useAuth: mockUseAuth,
}))

// "Hoy" y los created_at caen en días fijos elegidos por el test (no depende
// de la fecha real). La hora de la ventana de recogida SÍ se calcula con la
// implementación real de Intl (tz America/Santiago): es lo que se quiere
// comprobar en peakHours.
vi.mock('@/lib/utils/formatDate', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils/formatDate')>()
  state.realDateKey = actual.dateKeyInTimezone
  return { ...actual, dateKeyInTimezone: vi.fn(actual.dateKeyInTimezone) }
})

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

function packRow(overrides: Record<string, unknown> = {}) {
  return {
    pack_id: 'pk-1',
    title: 'Pack Panadería Artesanal',
    status: 'active',
    price_minor: 3990,
    currency_code: 'CLP',
    total_stock: 10,
    remaining_stock: 5,
    ...overrides,
  }
}

function resRow(overrides: Record<string, unknown> = {}) {
  return {
    reservation_id: 'r-1',
    pack_id: 'pk-1',
    pack_title: 'Pack Panadería Artesanal',
    customer_display_name: 'Cliente A',
    status: 'picked_up',
    payment_status: 'paid',
    total_amount_minor: 3990,
    currency_code: 'CLP',
    pickup_start_at: '2026-09-30T15:00:00-03:00',
    pickup_end_at: '2026-09-30T18:00:00-03:00',
    timezone: 'America/Santiago',
    created_at: '2026-09-27T10:00:00Z',
    ...overrides,
  }
}

const getMyShopData = {
  shop: {
    id: 'shop-a',
    name: 'Shop A',
    status: 'verified',
    logo_path: null,
    description: null,
    address_line1: null,
    phone_e164: null,
    latitude: null,
    longitude: null,
    locality_id: null,
  },
}

// Calendario fijo del escenario:
//   ahora      → 2026-09-30 (martes; la semana civil empieza el domingo 09-27)
//   RA entreg. → creada 09-27 (esta semana)
//   RB entreg. → creada 09-25 (semana anterior)
//   RC cancel. → creada 09-20 (semana anterior)
//   RD pend.   → creada 09-30 (esta semana, hoy)
const CREATED_A = '2026-09-27T10:00:00Z'
const CREATED_B = '2026-09-25T10:00:00Z'
const CREATED_C = '2026-09-20T10:00:00Z'
const CREATED_D = '2026-09-30T10:00:00Z'

let rpc: ReturnType<typeof vi.fn>
let from: ReturnType<typeof vi.fn>

function setupMockClient(
  packRows: Record<string, unknown>[] = [],
  resRows: Record<string, unknown>[] = [],
  rpcErrors: Record<string, { message: string; code?: string }> = {},
  shopData: unknown = getMyShopData,
) {
  rpc = vi.fn().mockImplementation((name: string) => {
    if (rpcErrors[name]) return Promise.resolve({ data: null, error: rpcErrors[name] })
    if (name === 'get_my_shop') return Promise.resolve({ data: shopData, error: null })
    if (name === 'list_my_packs') return Promise.resolve({ data: packRows, error: null })
    if (name === 'list_shop_reservations') return Promise.resolve({ data: resRows, error: null })
    return Promise.resolve({ data: null, error: { message: 'UNEXPECTED_RPC', code: 'P0001' } })
  })
  from = vi.fn()
  ;(supabaseBrowser as unknown as { mockReturnValue: (v: unknown) => void }).mockReturnValue({ rpc, from })
}

function pinDates() {
  ;(dateKeyInTimezone as unknown as { mockImplementation: (fn: unknown) => void }).mockImplementation(
    (iso: string | null) => {
      if (!iso) return ''
      if (iso === CREATED_A) return '2026-09-27'
      if (iso === CREATED_B) return '2026-09-25'
      if (iso === CREATED_C) return '2026-09-20'
      if (iso === CREATED_D) return '2026-09-30'
      return '2026-09-30' // "ahora"
    },
  )
}

const basePacks = [
  packRow({ pack_id: 'pk-1', status: 'active' }),
  packRow({ pack_id: 'pk-2', title: 'Pack Quesos', status: 'paused', remaining_stock: 2 }),
  packRow({ pack_id: 'pk-3', title: 'Pack Archivado', status: 'archived' }),
]

const baseReservations = [
  resRow({
    reservation_id: 'r-a',
    status: 'picked_up',
    total_amount_minor: 3990,
    created_at: CREATED_A,
    pickup_start_at: '2026-09-30T15:00:00-03:00',
  }),
  resRow({
    reservation_id: 'r-b',
    status: 'completed',
    total_amount_minor: 1500,
    created_at: CREATED_B,
    pickup_start_at: '2026-09-26T15:00:00-03:00',
  }),
  resRow({
    reservation_id: 'r-c',
    status: 'cancelled',
    total_amount_minor: 2000,
    created_at: CREATED_C,
    pickup_start_at: '2026-09-28T16:30:00-03:00',
  }),
  resRow({
    reservation_id: 'r-d',
    status: 'payment_pending',
    payment_status: 'pending',
    total_amount_minor: 5000,
    pack_id: 'pk-2',
    pack_title: 'Pack Quesos',
    created_at: CREATED_D,
    pickup_start_at: '2026-10-01T15:00:00-03:00',
  }),
]

describe('useBusinessAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({ user: state.user })
    pinDates()
    setupMockClient(basePacks, baseReservations)
  })

  it('carga con las RPCs canónicas existentes (sin SQL nueva y sin leer tablas)', async () => {
    const { result } = renderHook(() => useBusinessAnalytics(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(rpc).toHaveBeenCalledWith('list_my_packs', {
      p_before_created_at: null,
      p_before_pack_id: null,
      p_limit: 100,
    })
    expect(rpc).toHaveBeenCalledWith('list_shop_reservations', { p_shop_id: 'shop-a', p_limit: 100 })
    expect(from).not.toHaveBeenCalled()
  })

  it('summary: ingresos y completadas solo por entregados (picked_up + completed)', async () => {
    const { result } = renderHook(() => useBusinessAnalytics(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.summary).toEqual({
      totalRevenue: 5490, // r-a (3990) + r-b (1500): r-c cancelada, r-d pendiente
      totalReservations: 4,
      completedReservations: 2,
      cancelledReservations: 1,
      noShows: 0,
      activePacks: 1, // pk-1 (pk-3 archivado no cuenta)
      totalPacksCreated: 2,
    })
  })

  it('tendencias de 7 días: etiquetas MM-DD y días sin actividad en cero', async () => {
    const { result } = renderHook(() => useBusinessAnalytics(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.reservationTrend).toEqual([
      { date: '09-24', value: 0 },
      { date: '09-25', value: 1 },
      { date: '09-26', value: 0 },
      { date: '09-27', value: 1 },
      { date: '09-28', value: 0 },
      { date: '09-29', value: 0 },
      { date: '09-30', value: 1 },
    ])
    expect(result.current.revenueTrend).toEqual([
      { date: '09-24', value: 0 },
      { date: '09-25', value: 1500 },
      { date: '09-26', value: 0 },
      { date: '09-27', value: 3990 },
      { date: '09-28', value: 0 },
      { date: '09-29', value: 0 },
      { date: '09-30', value: 0 },
    ])
  })

  it('horarios pico: agrupa la hora de recogida en la tz de la fila, orden por frecuencia', async () => {
    const { result } = renderHook(() => useBusinessAnalytics(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.peakHours).toEqual([
      { hour: '15:00', count: 3 }, // r-a, r-b, r-d
      { hour: '16:30', count: 1 }, // r-c
    ])
  })

  it('top packs: ventas e ingresos por entregados, tasa de cancelación y orden descendente', async () => {
    const { result } = renderHook(() => useBusinessAnalytics(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.topPacks).toEqual([
      {
        id: 'pk-1',
        title: 'Pack Panadería Artesanal',
        totalSold: 2,
        revenue: 5490,
        cancellationRate: 33, // 1 cancelada de 3 (2 vendidas + 1 cancelada)
      },
      { id: 'pk-2', title: 'Pack Quesos', totalSold: 0, revenue: 0, cancellationRate: 0 },
    ])
  })

  it('tasa de éxito y comparativa semanal (semana civil, domingo a domingo)', async () => {
    const { result } = renderHook(() => useBusinessAnalytics(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.cancellationRate).toEqual({ completed: 2, cancelled: 1, noShow: 0, expired: 0 })
    expect(result.current.weeklyComparison).toEqual({
      currentWeek: { reservations: 2, revenue: 3990 }, // r-a (09-27) + r-d (09-30)
      lastWeek: { reservations: 2, revenue: 1500 }, // r-b (09-25) + r-c (09-20)
      reservationChange: 0, // 2 vs 2
      revenueChange: 166, // (3990 - 1500) / 1500
    })
  })

  it('sin datos: ceros y arrays vacíos (la página muestra sus estados vacíos, no gráficos a medias)', async () => {
    setupMockClient([], [])
    const { result } = renderHook(() => useBusinessAnalytics(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.summary).toEqual({
      totalRevenue: 0,
      totalReservations: 0,
      completedReservations: 0,
      cancelledReservations: 0,
      noShows: 0,
      activePacks: 0,
      totalPacksCreated: 0,
    })
    expect(result.current.reservationTrend.every((p) => p.value === 0)).toBe(true)
    expect(result.current.reservationTrend).toHaveLength(7)
    expect(result.current.revenueTrend.every((p) => p.value === 0)).toBe(true)
    expect(result.current.peakHours).toEqual([])
    expect(result.current.topPacks).toEqual([])
    expect(result.current.cancellationRate).toEqual({ completed: 0, cancelled: 0, noShow: 0, expired: 0 })
    expect(result.current.weeklyComparison).toEqual({
      currentWeek: { reservations: 0, revenue: 0 },
      lastWeek: { reservations: 0, revenue: 0 },
      reservationChange: 0,
      revenueChange: 0,
    })
  })

  it('traduce a español el error de la RPC', async () => {
    setupMockClient(basePacks, baseReservations, {
      list_my_packs: { message: 'SHOP_NOT_AUTHORIZED', code: '42501' },
    })
    const { result } = renderHook(() => useBusinessAnalytics(), { wrapper: createWrapper() })
    await waitFor(() =>
      expect(result.current.error).toBe(
        'Esta cuenta no gestiona ese comercio. Inicia sesión con la cuenta que lo administra.',
      ),
    )
  })
})
