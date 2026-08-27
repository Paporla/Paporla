import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useBusinessDashboard } from '@/components/business/dashboard/useBusinessDashboard'
import { supabaseBrowser } from '@/lib/supabase/client'
import { dateKeyInTimezone } from '@/lib/utils/formatDate'

const state = vi.hoisted(() => ({
  user: { id: 'owner-a' },
  // Implementación REAL de dateKeyInTimezone, capturada del módulo, para
  // poder restaurarla entre tests tras haberla sobrecargado.
  realDateKey: null as unknown,
}))

const mockUseAuth = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/useAuth', () => ({
  useAuth: mockUseAuth,
}))

// Se intercepta dateKeyInTimezone para que "hoy" y cada created_at caigan en
// los días que cada test elija (los tests no dependen de la fecha real). La
// conversión de zona horaria real se prueba en src/__tests__/utils/formatDate.test.ts.
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

/** Fila de list_my_packs (0014:419). */
function packRow(overrides: Record<string, unknown> = {}) {
  return {
    pack_id: 'pk-1',
    title: 'Pack Panadería Artesanal',
    status: 'active',
    price_minor: 3990,
    currency_code: 'CLP',
    total_stock: 10,
    remaining_stock: 5,
    pickup_start_at: '2026-09-30T15:00:00-03:00',
    pickup_end_at: '2026-09-30T18:00:00-03:00',
    image_path: null,
    created_at: '2026-08-01T12:00:00Z',
    updated_at: '2026-08-01T12:00:00Z',
    ...overrides,
  }
}

/** Fila canónica de list_shop_reservations (0014:333). */
function resRow(overrides: Record<string, unknown> = {}) {
  return {
    reservation_id: 'r-1',
    pack_id: 'pk-1',
    pack_title: 'Pack Panadería Artesanal',
    customer_display_name: 'Cliente A',
    status: 'payment_pending',
    payment_status: 'pending',
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

// Días fijos del escenario base (independiente de la fecha real):
//   ahora        → 2026-09-30 (un martes: la semana civil empieza 09-27)
//   RA (entreg.) → 2026-09-27 | RB (entreg.) → 2026-09-25
//   RC (pend.)   → 2026-09-20 | RD (cancel.) → 2026-09-30 (hoy)
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

/** "Hoy" fijo (2026-09-30) y cada created_at del escenario base en su día. */
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
  packRow({ pack_id: 'pk-2', status: 'paused', remaining_stock: 2 }),
  packRow({ pack_id: 'pk-3', status: 'sold_out', remaining_stock: 0 }),
  packRow({ pack_id: 'pk-4', status: 'draft' }),
  packRow({ pack_id: 'pk-5', status: 'archived' }),
]

const baseReservations = [
  resRow({ reservation_id: 'r-a', status: 'picked_up', total_amount_minor: 3990, created_at: CREATED_A }),
  resRow({ reservation_id: 'r-b', status: 'completed', total_amount_minor: 1500, created_at: CREATED_B }),
  resRow({ reservation_id: 'r-c', status: 'payment_pending', total_amount_minor: 5000, created_at: CREATED_C }),
  resRow({ reservation_id: 'r-d', status: 'cancelled', total_amount_minor: 2000, created_at: CREATED_D }),
]

describe('useBusinessDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({ user: state.user })
    pinDates()
    setupMockClient(basePacks, baseReservations)
  })

  it('carga packs y reservas con las RPCs canónicas (sin leer las tablas)', async () => {
    const { result } = renderHook(() => useBusinessDashboard(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(rpc).toHaveBeenCalledWith('list_my_packs', {
      p_before_created_at: null,
      p_before_pack_id: null,
      p_limit: 100,
    })
    expect(rpc).toHaveBeenCalledWith('list_shop_reservations', { p_shop_id: 'shop-a', p_limit: 100 })
    // El bug que este paso corrige: antes hacía SELECT directo a
    // packs/reservations (0012 los revocó → el panel no cargaba nada).
    expect(from).not.toHaveBeenCalled()
  })

  it('stats: ingresos solo por entregados, pendientes solo payment_pending, "hoy" por creación y crecimiento semanal', async () => {
    const { result } = renderHook(() => useBusinessDashboard(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.stats).toEqual({
      totalPacks: 4, // pk-5 archivado no cuenta (coherente con /business/packs)
      activePacks: 1,
      totalReservations: 4,
      pendingReservations: 1, // solo r-c (payment_pending)
      todayReservations: 1, // solo r-d (creada hoy)
      totalRevenue: 5490, // r-a (3990) + r-b (1500): r-c y r-d no entregaron
      weekGrowth: 200, // esta semana 3 (27, 25, 30) vs la anterior 1 (20)
    })
  })

  it('actividad reciente: ordenada por creación descendente y tope de 5', async () => {
    const extra = [
      resRow({ reservation_id: 'r-e', status: 'cancelled', created_at: '2026-09-15T10:00:00Z' }),
      resRow({ reservation_id: 'r-f', status: 'no_show', created_at: '2026-09-10T10:00:00Z' }),
    ]
    setupMockClient(basePacks, [...baseReservations, ...extra])
    const { result } = renderHook(() => useBusinessDashboard(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.recentReservations.map((r) => r.reservation_id)).toEqual([
      'r-d', // 09-30
      'r-a', // 09-27
      'r-b', // 09-25
      'r-c', // 09-20
      'r-e', // 09-15 (r-f queda fuera: tope de 5)
    ])
  })

  it('no consulta nada si el comercio no existe', async () => {
    setupMockClient([], [], {}, null)
    const { result } = renderHook(() => useBusinessDashboard(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.shop).toBeNull()
    expect(rpc).not.toHaveBeenCalledWith('list_my_packs', expect.anything())
    expect(rpc).not.toHaveBeenCalledWith('list_shop_reservations', expect.anything())
  })

  it('sin datos: ceros y weekGrowth 0 (estado vacío honesto, sin inventar)', async () => {
    setupMockClient([], [])
    const { result } = renderHook(() => useBusinessDashboard(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.stats).toEqual({
      totalPacks: 0,
      activePacks: 0,
      totalReservations: 0,
      pendingReservations: 0,
      todayReservations: 0,
      totalRevenue: 0,
      weekGrowth: 0,
    })
    expect(result.current.recentReservations).toEqual([])
  })

  it('traduce a español el error de la RPC (no ceros en silencio)', async () => {
    setupMockClient(basePacks, baseReservations, {
      list_shop_reservations: { message: 'SHOP_NOT_AUTHORIZED', code: '42501' },
    })
    const { result } = renderHook(() => useBusinessDashboard(), { wrapper: createWrapper() })
    await waitFor(() =>
      expect(result.current.error).toBe(
        'Esta cuenta no gestiona ese comercio. Inicia sesión con la cuenta que lo administra.',
      ),
    )
  })
})
