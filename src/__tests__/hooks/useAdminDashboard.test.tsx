import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAdminDashboard } from '@/components/admin/useAdminDashboard'
import { supabaseBrowser } from '@/lib/supabase/client'

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

const mockSelect = vi.fn()
const mockGte = vi.fn()
const mockLt = vi.fn()
const mockFrom = vi.fn()

function setupMockClient() {
  const chain = { select: mockSelect, gte: mockGte, lt: mockLt }
  mockSelect.mockReturnValue(chain)
  mockGte.mockReturnValue(chain)
  mockLt.mockResolvedValue({ count: 0, error: null })

  mockFrom.mockImplementation(() => chain)
  ;(supabaseBrowser as any).mockReturnValue({ from: mockFrom })
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

  it('returns empty reservationsByDay when chart data is not loaded', () => {
    const { result } = renderHook(() => useAdminDashboard(), { wrapper: createWrapper() })
    expect(result.current.reservationsByDay).toEqual([])
  })
})
