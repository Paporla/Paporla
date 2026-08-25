import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCreateReservation, type ReservationDetails } from '@/hooks/useCreateReservation'
import { supabaseBrowser } from '@/lib/supabase/client'
import { trackPurchase } from '@/lib/analytics/events'

const mockUseAuth = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/useAuth', () => ({
  useAuth: mockUseAuth,
}))
vi.mock('@/lib/analytics/events', () => ({
  trackPurchase: vi.fn(),
}))

let activeQueryClient: QueryClient | null = null

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  activeQueryClient = queryClient
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

const PACK_INFO = {
  title: 'Pack sushi sorpresa',
  imageUrl: 'https://staging.storage.supabase.com/shop-1/pack-1/abc.jpg',
  price_minor: 9990,
  currency_code: 'CLP',
  shopName: 'Sushi Do',
  shopAddress: 'Av. Providencia 1234, Santiago',
  pickupStartAt: '2026-08-25T17:00:00-04:00',
  pickupEndAt: '2026-08-25T19:00:00-04:00',
  timezone: 'America/Santiago',
}

function rpcSuccess(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      success: true,
      idempotent_replay: false,
      reservation_id: 'res-1',
      status: 'payment_pending',
      payment_status: 'created',
      hold_expires_at: '2026-08-24T18:10:00Z',
      capture_scheduled_at: null,
      amount_minor: 9990,
      currency_code: 'CLP',
      ...overrides,
    },
    error: null,
  }
}

function rpcError(message: string, code: string) {
  return { data: null, error: { message, code, details: '', hint: '' } }
}

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

let rpc: ReturnType<typeof vi.fn>

function setupMockClient() {
  rpc = vi.fn().mockResolvedValue({ data: null, error: null })
  ;(supabaseBrowser as any).mockReturnValue({ rpc })
}

function argsOf(callIndex: number): { p_pack_id: string; p_idempotency_key: string } {
  return (rpc.mock.calls[callIndex] as [string, { p_pack_id: string; p_idempotency_key: string }])[1]
}

describe('useCreateReservation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    activeQueryClient = null
    setupMockClient()
    rpc.mockResolvedValue(rpcSuccess())
    mockUseAuth.mockReturnValue({ user: { id: 'user-1', email: 'user@paporla.cl', displayName: 'Test' } })
  })

  it('llama a create_payment_reservation con el pack y una clave UUID v4, y devuelve los datos canónicos', async () => {
    const { result } = renderHook(() => useCreateReservation(), { wrapper: createWrapper() })

    let details!: ReservationDetails | null
    await act(async () => {
      details = await result.current.createReservation('pack-1', PACK_INFO)
    })

    expect(rpc).toHaveBeenCalledWith('create_payment_reservation', {
      p_pack_id: 'pack-1',
      p_idempotency_key: expect.stringMatching(UUID_V4),
    })
    expect(details).not.toBeNull()
    expect(details?.id).toBe('res-1')
    expect(details?.status).toBe('payment_pending')
    expect(details?.paymentStatus).toBe('created')
    expect(details?.holdExpiresAt).toBe('2026-08-24T18:10:00Z')
    expect(details?.amountMinor).toBe(9990)
    expect(details?.currencyCode).toBe('CLP')
    expect(details?.idempotentReplay).toBe(false)
    expect(details?.pack.title).toBe('Pack sushi sorpresa')
  })

  it('traduce PACK_NOT_AVAILABLE al mensaje en español y devuelve null', async () => {
    rpc.mockResolvedValue(rpcError('PACK_NOT_AVAILABLE', 'P0001'))
    const { result } = renderHook(() => useCreateReservation(), { wrapper: createWrapper() })

    let details!: ReservationDetails | null
    await act(async () => {
      details = await result.current.createReservation('pack-1', PACK_INFO)
    })

    expect(details).toBeNull()
    expect(result.current.error).toBe(
      'Este pack no está disponible ahora mismo: puede que se agotó o que su ventana de recogida ya no esté abierta.',
    )
  })

  it('reutiliza la misma clave de idempotencia al reintentar el mismo pack tras un fallo', async () => {
    rpc.mockResolvedValueOnce(rpcError('PACK_NOT_AVAILABLE', 'P0001')).mockResolvedValueOnce(rpcSuccess())
    const { result } = renderHook(() => useCreateReservation(), { wrapper: createWrapper() })

    let first!: ReservationDetails | null
    await act(async () => {
      first = await result.current.createReservation('pack-1', PACK_INFO)
    })
    expect(first).toBeNull()

    let second!: ReservationDetails | null
    await act(async () => {
      second = await result.current.createReservation('pack-1', PACK_INFO)
    })
    expect(second).not.toBeNull()

    expect(rpc).toHaveBeenCalledTimes(2)
    expect(argsOf(0).p_idempotency_key).toBe(argsOf(1).p_idempotency_key)
  })

  it('genera una clave distinta cuando cambia el pack (nueva intención)', async () => {
    rpc.mockResolvedValueOnce(rpcError('PACK_NOT_AVAILABLE', 'P0001')).mockResolvedValueOnce(rpcSuccess())
    const { result } = renderHook(() => useCreateReservation(), { wrapper: createWrapper() })

    await act(async () => {
      await result.current.createReservation('pack-1', PACK_INFO)
    })
    await act(async () => {
      await result.current.createReservation('pack-2', PACK_INFO)
    })

    expect(rpc).toHaveBeenCalledTimes(2)
    expect(argsOf(0).p_pack_id).toBe('pack-1')
    expect(argsOf(1).p_pack_id).toBe('pack-2')
    expect(argsOf(0).p_idempotency_key).not.toBe(argsOf(1).p_idempotency_key)
  })

  it('muestra idempotentReplay true cuando la base devolvió la reserva ya existente', async () => {
    rpc.mockResolvedValue(rpcSuccess({ idempotent_replay: true }))
    const { result } = renderHook(() => useCreateReservation(), { wrapper: createWrapper() })

    let details!: ReservationDetails | null
    await act(async () => {
      details = await result.current.createReservation('pack-1', PACK_INFO)
    })

    expect(details?.idempotentReplay).toBe(true)
    expect(details?.id).toBe('res-1')
  })

  it('sin sesión no llama a la RPC y muestra el mensaje de login', async () => {
    mockUseAuth.mockReturnValue({ user: null })
    const { result } = renderHook(() => useCreateReservation(), { wrapper: createWrapper() })

    let details!: ReservationDetails | null
    await act(async () => {
      details = await result.current.createReservation('pack-1', PACK_INFO)
    })

    expect(details).toBeNull()
    expect(result.current.error).toBe('Debes iniciar sesión para reservar')
    expect(rpc).not.toHaveBeenCalled()
  })

  it('registra el purchase de GA4 con unidades menores y moneda canónicas', async () => {
    const { result } = renderHook(() => useCreateReservation(), { wrapper: createWrapper() })

    await act(async () => {
      await result.current.createReservation('pack-1', PACK_INFO)
    })

    expect(trackPurchase).toHaveBeenCalledWith('res-1', 'pack-1', 'Pack sushi sorpresa', 9990, 'CLP', 'Sushi Do')
  })

  it('al exito invalida la caché del catálogo (public-packs) y de "mis reservas"', async () => {
    const wrapper = createWrapper()
    const qc = activeQueryClient!
    // Datos cacheados como si el usuario estuviera navegando antes de reservar.
    qc.setQueryData(['public-packs', 'cl-market', '', null, null, 10], ['pack-1'])
    qc.setQueryData(['reservations'], [])

    const { result } = renderHook(() => useCreateReservation(), { wrapper })

    await act(async () => {
      await result.current.createReservation('pack-1', PACK_INFO)
    })

    // El hook no hace fetch él mismo: marca las cachés como stale para que el
    // catálogo y el dashboard se actualicen en cuanto se usen ("Seguir
    // explorando" ya no mostraría el pack agotado esperando 30 s ni F5).
    expect(qc.getQueryState(['public-packs', 'cl-market', '', null, null, 10])?.isInvalidated).toBe(true)
    expect(qc.getQueryState(['reservations'])?.isInvalidated).toBe(true)
  })
})
