import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAdminDashboard } from '@/components/admin/useAdminDashboard'
import { supabaseBrowser } from '@/lib/supabase/client'

/**
 * useAdminDashboard: contadores sobre useAdminCounts (RPC admin_counts, 0027)
 * y gráfico de 7 días sobre la RPC admin_dashboard_trend (0032, Fase 6.5).
 * La versión pre-6.5 hacía 7 consultas head .from('reservations') que el
 * esquema deniega; aquí se protege el nombre de la RPC y el mapeo de
 * reservations_by_day a la forma { day, reservations } que consume /admin.
 */

vi.mock('@/lib/query/useAdminCounts', () => ({
  useAdminCounts: vi.fn(() => ({
    data: { users: 10, shops: 5, packs: 20, reservations: 100, verifiedShops: 3, bannedShops: 1, pendingShops: 1 },
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

const mockRpc = vi.fn()

function setupMockClient() {
  mockRpc.mockResolvedValue({
    data: {
      reservations_by_day: [
        { day: '08-26', count: 3 },
        { day: '08-27', count: 0 },
      ],
      revenue_by_month: [],
      top_shops: [],
      currency_code: 'CLP',
    },
    error: null,
  })
  ;(supabaseBrowser as any).mockReturnValue({ rpc: mockRpc })
}

describe('useAdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMockClient()
  })

  it('returns stats from useAdminCounts', () => {
    const { result } = renderHook(() => useAdminDashboard(), { wrapper: createWrapper() })

    expect(result.current.stats.totalUsers).toBe(10)
    expect(result.current.stats.totalShops).toBe(5)
    expect(result.current.stats.totalPacks).toBe(20)
    expect(result.current.stats.totalReservations).toBe(100)
    expect(result.current.stats.verifiedShops).toBe(3)
    expect(result.current.stats.bannedShops).toBe(1)
    expect(result.current.stats.pendingShops).toBe(1)
  })

  it('llama a admin_dashboard_trend para el gráfico de 7 días', async () => {
    renderHook(() => useAdminDashboard(), { wrapper: createWrapper() })
    await waitFor(() => expect(mockRpc).toHaveBeenCalledWith('admin_dashboard_trend'))
  })

  it('mapea reservations_by_day a la forma { day, reservations } del dashboard', async () => {
    const { result } = renderHook(() => useAdminDashboard(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.reservationsByDay).toHaveLength(2))
    expect(result.current.reservationsByDay).toEqual([
      { day: '08-26', reservations: 3 },
      { day: '08-27', reservations: 0 },
    ])
  })

  it('reservationsByDay vacío mientras no llega la RPC', () => {
    mockRpc.mockImplementation(() => new Promise(() => {}))
    const { result } = renderHook(() => useAdminDashboard(), { wrapper: createWrapper() })
    expect(result.current.reservationsByDay).toEqual([])
  })
})
