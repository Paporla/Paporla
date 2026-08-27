import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useBusinessReservations, ReservationItem } from '@/components/business/reservations/useBusinessReservations'
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

// El hook lee ?status= para arrancar ya filtrado (tarjetas del dashboard/
// analytics, F4.4). Mock mutable para probar cada variante por separado.
const searchParamsState = vi.hoisted(() => ({
  params: new URLSearchParams(''),
}))
vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParamsState.params,
}))

// Solo se intercepta dateKeyInTimezone (el "hoy" del contador); el resto de
// los helpers de fechas siguen siendo reales. La conversión de zona horaria
// real se prueba en src/__tests__/utils/formatDate.test.ts.
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

/** Fila canónica de list_shop_reservations (0014:333), como la staging. */
function shopRow(overrides: Partial<ReservationItem> = {}): ReservationItem {
  return {
    reservation_id: 'r-1',
    pack_id: 'p-1',
    pack_title: 'Pack Panadería Artesanal',
    customer_display_name: 'Cliente A',
    status: 'payment_pending',
    payment_status: 'pending',
    total_amount_minor: 3990,
    currency_code: 'CLP',
    pickup_start_at: '2026-09-30T15:00:00-04:00',
    pickup_end_at: '2026-09-30T18:00:00-04:00',
    timezone: 'America/Santiago',
    created_at: '2026-08-26T12:00:00Z',
    ...overrides,
  }
}

let rpc: ReturnType<typeof vi.fn>

function setupMockClient(
  rows: ReservationItem[],
  rpcErrors: Record<string, { message: string; code?: string }> = {},
  getMyShopData: unknown = {
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
  },
  confirmData: Record<string, unknown> = {
    success: true,
    idempotent_replay: false,
    status: 'ready_pickup',
    payment_status: 'paid',
    pickup_code: 'P4P-ABCD1234',
  },
) {
  rpc = vi.fn().mockImplementation((name: string, args?: Record<string, unknown>) => {
    if (rpcErrors[name]) return Promise.resolve({ data: null, error: rpcErrors[name] })
    if (name === 'get_my_shop') return Promise.resolve({ data: getMyShopData, error: null })
    if (name === 'list_shop_reservations') return Promise.resolve({ data: rows, error: null })
    if (name === 'cancel_reservation')
      return Promise.resolve({
        data: {
          success: true,
          idempotent_replay: false,
          reservation_id: args?.p_reservation_id,
          payment_action: 'cancel_checkout',
        },
        error: null,
      })
    if (name === 'confirm_shop_reservation')
      return Promise.resolve({
        data: { ...confirmData, reservation_id: args?.p_reservation_id },
        error: null,
      })
    return Promise.resolve({ data: { success: true }, error: null })
  })
  ;(supabaseBrowser as unknown as { mockReturnValue: (v: unknown) => void }).mockReturnValue({
    rpc,
    from: vi.fn(),
  })
}

describe('useBusinessReservations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({ user: state.user })
    searchParamsState.params = new URLSearchParams('')
    ;(dateKeyInTimezone as unknown as { mockImplementation: (fn: unknown) => void }).mockImplementation(
      state.realDateKey,
    )
    setupMockClient([
      shopRow(),
      shopRow({ reservation_id: 'r-2', status: 'cancelled', pickup_start_at: '2026-09-20T15:00:00-04:00' }),
    ])
  })

  it('carga las reservas del comercio con list_shop_reservations (no leyendo la tabla)', async () => {
    const { result } = renderHook(() => useBusinessReservations(), { wrapper: createWrapper() })
    expect(result.current.shopId).toBeNull()
    await waitFor(() => expect(result.current.shopId).toBe('shop-a'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(rpc).toHaveBeenCalledWith('list_shop_reservations', { p_shop_id: 'shop-a', p_limit: 100 })
    // Activas primero (recogida más cercana), luego el historial.
    expect(result.current.reservations.map((r) => r.reservation_id)).toEqual(['r-1', 'r-2'])
  })

  it('expone las 12 columnas canónicas de la RPC, sin inventar campos', async () => {
    setupMockClient([shopRow()])
    const { result } = renderHook(() => useBusinessReservations(), { wrapper: createWrapper() })
    // `loading` del listado se pone a false en cuanto llega el comercio
    // (antes, está deshabilitado), así que primero se espera el shopId.
    await waitFor(() => expect(result.current.shopId).toBe('shop-a'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.reservations[0]).toEqual({
      reservation_id: 'r-1',
      pack_id: 'p-1',
      pack_title: 'Pack Panadería Artesanal',
      customer_display_name: 'Cliente A',
      status: 'payment_pending',
      payment_status: 'pending',
      total_amount_minor: 3990,
      currency_code: 'CLP',
      pickup_start_at: '2026-09-30T15:00:00-04:00',
      pickup_end_at: '2026-09-30T18:00:00-04:00',
      timezone: 'America/Santiago',
      created_at: '2026-08-26T12:00:00Z',
    })
  })

  it('no consulta reservas si el comercio no existe', async () => {
    setupMockClient([], {}, null)
    const { result } = renderHook(() => useBusinessReservations(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.shopId).toBeNull())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(rpc).not.toHaveBeenCalledWith('list_shop_reservations', expect.anything())
  })

  it('cancela con p_reservation_id y p_reason (NUNCA p_cancel_reason) e invalida la lista', async () => {
    const { result } = renderHook(() => useBusinessReservations(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.shopId).toBe('shop-a'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.cancelReservation('r-1')
    })

    const cancelCall = rpc.mock.calls.find(([name]) => name === 'cancel_reservation')
    expect(cancelCall).toBeDefined()
    expect(cancelCall![1]).toEqual({
      p_reservation_id: 'r-1',
      p_reason: 'Cancelada por el comercio',
    })
    expect(cancelCall![1]).not.toHaveProperty('p_cancel_reason')
    expect(result.current.success).toBe('Reserva cancelada y stock reintegrado')
    // Invalidación: la lista se vuelve a pedir.
    expect(rpc.mock.calls.filter(([name]) => name === 'list_shop_reservations')).toHaveLength(2)
  })

  it('filtra por estado canónico en el cliente', async () => {
    const { result } = renderHook(() => useBusinessReservations(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.shopId).toBe('shop-a'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.reservations).toHaveLength(2)

    act(() => {
      result.current.setStatusFilter('cancelled')
    })
    expect(result.current.reservations.map((r) => r.reservation_id)).toEqual(['r-2'])

    act(() => {
      result.current.setStatusFilter('all')
    })
    expect(result.current.reservations).toHaveLength(2)
  })

  it('busca por cliente o por pack', async () => {
    setupMockClient([
      shopRow({ reservation_id: 'r-1', customer_display_name: 'María', pack_title: 'Pack Panadería' }),
      shopRow({ reservation_id: 'r-2', customer_display_name: 'Pedro', pack_title: 'Pack Quesos' }),
    ])
    const { result } = renderHook(() => useBusinessReservations(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.shopId).toBe('shop-a'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      result.current.setSearchTerm('maria')
    })
    expect(result.current.reservations.map((r) => r.reservation_id)).toEqual(['r-1'])

    act(() => {
      result.current.setSearchTerm('quesos')
    })
    expect(result.current.reservations.map((r) => r.reservation_id)).toEqual(['r-2'])

    act(() => {
      result.current.setSearchTerm('')
    })
    expect(result.current.reservations).toHaveLength(2)
  })

  it('traduce a español los errores de la RPC', async () => {
    setupMockClient([], { list_shop_reservations: { message: 'SHOP_NOT_AUTHORIZED', code: '42501' } })
    const { result } = renderHook(() => useBusinessReservations(), { wrapper: createWrapper() })
    await waitFor(() =>
      expect(result.current.error).toBe(
        'Esta cuenta no gestiona ese comercio. Inicia sesión con la cuenta que lo administra.',
      ),
    )
  })

  it('stats: ingresos solo por recogidas/completadas y "Hoy" solo por recogidas activas de hoy', async () => {
    const P_TODAY = '2026-09-30T15:00:00-04:00'
    const P_TOMORROW = '2026-10-01T15:00:00-04:00'
    setupMockClient([
      shopRow({ reservation_id: 'r-1', status: 'picked_up', total_amount_minor: 3990, pickup_start_at: P_TODAY }),
      shopRow({ reservation_id: 'r-2', status: 'payment_pending', total_amount_minor: 5000, pickup_start_at: P_TODAY }),
      shopRow({ reservation_id: 'r-3', status: 'confirmed', total_amount_minor: 2000, pickup_start_at: P_TOMORROW }),
      shopRow({ reservation_id: 'r-4', status: 'cancelled', total_amount_minor: 999, pickup_start_at: P_TODAY }),
    ])
    // "Hoy" fijo para el test: el hook compara dateKey(pickup) con dateKey(now).
    ;(dateKeyInTimezone as unknown as { mockImplementation: (fn: unknown) => void }).mockImplementation(
      (iso: string | null) => {
        if (!iso) return ''
        if (iso === P_TODAY) return '2026-09-30'
        if (iso === P_TOMORROW) return '2026-10-01'
        return '2026-09-30'
      },
    )

    const { result } = renderHook(() => useBusinessReservations(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.shopId).toBe('shop-a'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.stats).toEqual({
      total: 4,
      pending: 1,
      confirmed: 1,
      ready: 0,
      completed: 1,
      noShow: 0,
      cancelled: 1,
      expired: 0,
      revenue: 3990, // solo r-1 (picked_up): r-2 sigue a la espera, r-4 cancelada
      todayCount: 1, // solo r-2: activa y con recogida hoy (r-1 ya se recogió, r-3 mañana, r-4 cancelada)
    })
  })

  it('confirma con p_reservation_id (NUNCA otro nombre) y devuelve el código de recogida', async () => {
    const { result } = renderHook(() => useBusinessReservations(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.shopId).toBe('shop-a'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.confirmReservation('r-1')
    })

    const confirmCall = rpc.mock.calls.find(([name]) => name === 'confirm_shop_reservation')
    expect(confirmCall).toBeDefined()
    expect(confirmCall![1]).toEqual({ p_reservation_id: 'r-1' })
    expect(result.current.confirmResult).toEqual({
      code: 'P4P-ABCD1234',
      packTitle: 'Pack Panadería Artesanal',
      note: null,
    })
    expect(result.current.success).toContain('confirmada')
    // Invalidación: la lista se vuelve a pedir.
    expect(rpc.mock.calls.filter(([name]) => name === 'list_shop_reservations')).toHaveLength(2)
  })

  it('repetir la confirmación devuelve la nota sin código (repetición idempotente)', async () => {
    setupMockClient([shopRow({ status: 'ready_pickup' })], {}, undefined, {
      success: true,
      idempotent_replay: true,
      status: 'ready_pickup',
      payment_status: 'paid',
      pickup_code: null,
      note: 'El codigo ya fue emitido y solo se muestra una vez (se guarda su huella).',
    })
    const { result } = renderHook(() => useBusinessReservations(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.shopId).toBe('shop-a'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.confirmReservation('r-1')
    })

    expect(result.current.confirmResult?.code).toBeNull()
    expect(result.current.confirmResult?.note).toContain('una vez')
    expect(result.current.confirmResult?.packTitle).toBe('Pack Panadería Artesanal')
  })

  it('traduce a español el error de la confirmación', async () => {
    setupMockClient([shopRow()], {
      confirm_shop_reservation: { message: 'NOT_AUTHORIZED_FOR_RESERVATION', code: '42501' },
    })
    const { result } = renderHook(() => useBusinessReservations(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.shopId).toBe('shop-a'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.confirmReservation('r-1')
    })

    expect(result.current.confirmResult).toBeNull()
    expect(result.current.error).toBe('No tienes permiso para gestionar esta reserva.')
  })

  it('arranca con el filtro de ?status= cuando es un estado canónico', async () => {
    searchParamsState.params = new URLSearchParams('status=payment_pending')
    const { result } = renderHook(() => useBusinessReservations(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.shopId).toBe('shop-a'))
    expect(result.current.statusFilter).toBe('payment_pending')
  })

  it('ignora ?status= legacy o desconocido: cae a "todas" (solo estados canónicos)', async () => {
    searchParamsState.params = new URLSearchParams('status=pending')
    const { result } = renderHook(() => useBusinessReservations(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.shopId).toBe('shop-a'))
    expect(result.current.statusFilter).toBe('all')
  })
})
