import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { usePacks } from '@/hooks/usePacks'
import { supabaseBrowser } from '@/lib/supabase/client'

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
const mockGt = vi.fn()
const mockOrder = vi.fn()
const mockFrom = vi.fn()
const mockMaybeSingle = vi.fn()

function setupMockClient() {
  mockSelect.mockReturnThis()
  mockEq.mockReturnThis()
  mockGt.mockReturnThis()
  mockOrder.mockResolvedValue({ data: [], error: null })
  mockMaybeSingle.mockResolvedValue({ data: null, error: null })
  mockFrom.mockImplementation((table: string) => {
    if (table === 'packs') {
      return {
        select: mockSelect,
        eq: mockEq,
        gt: mockGt,
        order: mockOrder,
        maybeSingle: mockMaybeSingle,
      }
    }
    return {}
  })
  ;(supabaseBrowser as any).mockReturnValue({
    from: mockFrom,
  })
}

describe('usePacks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMockClient()
  })

  it('starts with empty packs', () => {
    const { result } = renderHook(() => usePacks(), { wrapper: createWrapper() })
    expect(result.current.packs).toEqual([])
  })

  it('fetches packs without shopId filter', async () => {
    const mockData = [{ id: 'p-1', title: 'Pack 1', shop: { name: 'Shop 1' } }]
    mockOrder.mockResolvedValue({ data: mockData, error: null })

    const { result } = renderHook(() => usePacks(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.packs).toEqual(mockData)
    expect(mockEq).toHaveBeenCalledWith('is_active', true)
    expect(mockGt).toHaveBeenCalledWith('remaining_stock', 0)
  })

  it('fetches packs with shopId filter', async () => {
    const { result } = renderHook(() => usePacks('shop-1'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(mockEq).toHaveBeenCalledWith('shop_id', 'shop-1')
  })

  it('returns error when query fails', async () => {
    mockOrder.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const { result } = renderHook(() => usePacks(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.error).toBe('DB error'))
  })

  it('getPackById fetches single pack', async () => {
    const mockPack = { id: 'p-1', title: 'Pack 1', shop: { name: 'Shop 1' } }
    mockMaybeSingle.mockResolvedValue({ data: mockPack, error: null })

    const { result } = renderHook(() => usePacks(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))

    const pack = await result.current.getPackById('p-1')
    expect(pack).toEqual(mockPack)
  })
})
