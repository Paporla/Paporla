import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAdminStats } from '@/components/admin/useAdminStats'
import { supabaseBrowser } from '@/lib/supabase/client'

/**
 * useAdminStats (/admin/stats): contadores sobre useAdminCounts (0027),
 * registros/roles sobre user_profiles (GRANT directo, 0012) y top 5
 * comercios sobre la RPC admin_dashboard_trend (0032, Fase 6.5) — la versión
 * pre-6.5 hacía .from('reservations') + .from('shops') directos, que el
 * esquema deniega, y el top salía vacío sin avisar.
 */

vi.mock('@/lib/query/useAdminCounts', () => ({
  useAdminCounts: vi.fn(() => ({
    data: { users: 50, shops: 10, packs: 30, reservations: 200, verifiedShops: 5, bannedShops: 2, pendingShops: 3 },
    isLoading: false,
    isSuccess: true,
  })),
}))

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

describe('useAdminStats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMockClient()
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
})
