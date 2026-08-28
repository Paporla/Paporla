import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAdminStats } from '@/components/admin/useAdminStats'
import { supabaseBrowser } from '@/lib/supabase/client'

/**
 * useAdminStats (/admin/stats): contadores sobre useAdminCounts (0027),
 * registros/roles sobre user_profiles (GRANT directo, 0012) y top 5
 * comercios sobre la RPC admin_dashboard_trend (0032, Fase 6.5) — la versión
 * pre-6.5 hacía .from('reservations') + .from('shops') directos, que el
 * esquema deniega, y el top salía vacío sin avisar.
 *
 * FASE 6.6: `error` y `retry` (no más skeleton infinito) y los errores de
 * las consultas de user_profiles se propagan en vez de tragarse con
 * `count ?? 0` (ceros en silencio).
 */

const countsMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/query/useAdminCounts', () => ({
  useAdminCounts: countsMock,
}))

// El helper de timeout corre con 50 ms en tests (no los 30 s reales).
vi.mock('@/lib/utils/rpcWithTimeout', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils/rpcWithTimeout')>()
  type CallArg = Parameters<(typeof actual)['rpcWithTimeout']>[0]
  return {
    ...actual,
    rpcWithTimeout: (call: CallArg, rpcName: string) => actual.rpcWithTimeout(call, rpcName, 50),
  }
})

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockGte = vi.fn()
const mockLt = vi.fn()
const mockFrom = vi.fn()
const mockRpc = vi.fn()

function setupMockClient() {
  const chain = { select: mockSelect, eq: mockEq, gte: mockGte, lt: mockLt }
  mockSelect.mockReturnValue(chain)
  mockEq.mockReturnValue(chain)
  mockGte.mockReturnValue(chain)
  mockLt.mockResolvedValue({ count: 0, error: null })

  mockFrom.mockImplementation(() => chain)
  mockRpc.mockResolvedValue({
    data: {
      reservations_by_day: [],
      revenue_by_month: [],
      top_shops: [
        { shop_id: 'shop-1', name: 'Panadería Staging A', reservations: 4 },
        { shop_id: 'shop-2', name: 'Cafetería Staging B', reservations: 2 },
      ],
      currency_code: 'CLP',
    },
    error: null,
  })
  ;(supabaseBrowser as any).mockReturnValue({ from: mockFrom, rpc: mockRpc })
}

function setupCounts(overrides: Record<string, unknown> = {}) {
  countsMock.mockReturnValue({
    data: { users: 50, shops: 10, packs: 30, reservations: 200, verifiedShops: 5, bannedShops: 2, pendingShops: 3 },
    isLoading: false,
    isSuccess: true,
    isError: false,
    refetch: vi.fn(),
    ...overrides,
  })
}

describe('useAdminStats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMockClient()
    setupCounts()
  })

  it('returns summary from useAdminCounts', () => {
    const { result } = renderHook(() => useAdminStats(), { wrapper: createWrapper() })

    expect(result.current.summary.totalUsers).toBe(50)
    expect(result.current.summary.totalShops).toBe(10)
    expect(result.current.summary.totalPacks).toBe(30)
    expect(result.current.summary.totalReservations).toBe(200)
  })

  it('mapea topShops desde admin_dashboard_trend (0032) a { name, reservations }', async () => {
    const { result } = renderHook(() => useAdminStats(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.topShops).toHaveLength(2))
    expect(result.current.topShops[0]).toEqual({ name: 'Panadería Staging A', reservations: 4 })
    expect(result.current.topShops[1]).toEqual({ name: 'Cafetería Staging B', reservations: 2 })
  })

  it('userStats/roleDistribution siguen llegando vacíos hasta que responden las consultas', () => {
    const { result } = renderHook(() => useAdminStats(), { wrapper: createWrapper() })
    expect(result.current.userStats).toEqual([])
    expect(result.current.roleDistribution).toEqual([])
  })

  it('computes growth as 0 when no historical data', async () => {
    const { result } = renderHook(() => useAdminStats(), { wrapper: createWrapper() })
    await waitFor(() => {})
    expect(result.current.growth.users).toBe(0)
  })

  it('Fase 6.6: expone error=true si la RPC de tendencia falla', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'ADMIN_REQUIRED', code: '42501' } })
    const { result } = renderHook(() => useAdminStats(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.error).toBe(true))
  })

  it('Fase 6.6: propaga el error de user_profiles en vez de tragarlo (ceros en silencio)', async () => {
    mockLt.mockResolvedValue({
      count: null,
      error: { message: 'permission denied for table user_profiles', code: '42501' },
    })
    const { result } = renderHook(() => useAdminStats(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.error).toBe(true))
  })

  it('Fase 6.6: retry repite las consultas (contadores, tendencia y user_profiles)', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'ADMIN_REQUIRED', code: '42501' } })
    const refetch = vi.fn()
    setupCounts({ data: null, isSuccess: false, isError: true, refetch })
    const { result } = renderHook(() => useAdminStats(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.error).toBe(true))
    const llamadasAntes = mockRpc.mock.calls.length
    act(() => {
      result.current.retry()
    })
    expect(refetch).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(mockRpc.mock.calls.length).toBeGreaterThan(llamadasAntes))
  })
})
