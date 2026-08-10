import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAdminStats } from '@/components/admin/useAdminStats'
import { supabaseBrowser } from '@/lib/supabase/client'

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

function setupMockClient() {
  const chain = { select: mockSelect, eq: mockEq, gte: mockGte, lt: mockLt }
  mockSelect.mockReturnValue(chain)
  mockEq.mockReturnValue(chain)
  mockGte.mockReturnValue(chain)
  mockLt.mockResolvedValue({ count: 0, error: null })

  mockFrom.mockImplementation(() => chain)
  ;(supabaseBrowser as any).mockReturnValue({ from: mockFrom })
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

  it('returns empty arrays for supplemental stats by default', () => {
    const { result } = renderHook(() => useAdminStats(), { wrapper: createWrapper() })
    expect(result.current.userStats).toEqual([])
    expect(result.current.roleDistribution).toEqual([])
    expect(result.current.topShops).toEqual([])
  })

  it('computes growth as 0 when no historical data', async () => {
    const { result } = renderHook(() => useAdminStats(), { wrapper: createWrapper() })
    await waitFor(() => {})
    expect(result.current.growth.users).toBe(0)
  })
})
