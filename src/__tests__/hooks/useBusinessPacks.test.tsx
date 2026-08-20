import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useBusinessPacks } from '@/components/business/packs/useBusinessPacks'
import { supabaseBrowser } from '@/lib/supabase/client'

const mockUseAuth = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/useAuth', () => ({
  useAuth: mockUseAuth,
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

let packChain: any
let rpc: ReturnType<typeof vi.fn>

function setupMockClient() {
  rpc = vi.fn().mockResolvedValue({
    data: {
      shop: {
        id: 'shop-1',
        name: 'Shop 1',
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
    error: null,
  })

  packChain = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn().mockResolvedValue({ data: [], error: null }),
    update: vi.fn(),
  }
  packChain.select.mockReturnValue(packChain)
  packChain.eq.mockReturnValue(packChain)
  packChain.update.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })

  const mockFrom = vi.fn((table: string) => {
    if (table === 'packs') return packChain
    return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis() }
  })
  ;(supabaseBrowser as any).mockReturnValue({ from: mockFrom, rpc })
}

describe('useBusinessPacks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMockClient()
    mockUseAuth.mockReturnValue({ user: { id: 'user-1', name: 'Test' } })
  })

  it('starts with empty packs', () => {
    const { result } = renderHook(() => useBusinessPacks(), { wrapper: createWrapper() })
    expect(result.current.packs).toEqual([])
  })

  it('resolves shopId when shop query succeeds', async () => {
    const { result } = renderHook(() => useBusinessPacks(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.shopId).toBe('shop-1'))
    expect(rpc).toHaveBeenCalledWith('get_my_shop')
  })

  it('fetches packs for the shop when shop is loaded', async () => {
    const mockPacks = [
      { id: 'p-1', title: 'Pack 1', is_active: true, remaining_stock: 10, total_stock: 20 },
      { id: 'p-2', title: 'Pack 2', is_active: false, remaining_stock: 0, total_stock: 10 },
    ]
    packChain.order.mockResolvedValue({ data: mockPacks, error: null })

    const { result } = renderHook(() => useBusinessPacks(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.shopId).toBe('shop-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(packChain.select).toHaveBeenCalled()
    expect(packChain.eq).toHaveBeenCalledWith('shop_id', 'shop-1')
    expect(result.current.packs).toEqual(mockPacks)
  })

  it('filters packs by search term', async () => {
    const mockPacks = [
      { id: 'p-1', title: 'Pan Artesanal', is_active: true, remaining_stock: 10, total_stock: 20 },
      { id: 'p-2', title: 'Croissant', is_active: true, remaining_stock: 5, total_stock: 10 },
    ]
    packChain.order.mockResolvedValue({ data: mockPacks, error: null })

    const { result } = renderHook(() => useBusinessPacks(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.shopId).toBe('shop-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      result.current.setSearchTerm('pan')
    })

    expect(result.current.packs).toHaveLength(1)
    expect(result.current.packs[0].title).toBe('Pan Artesanal')
  })

  it('calls delete mutation and invalidates query', async () => {
    packChain.order.mockResolvedValue({ data: [], error: null })

    const { result } = renderHook(() => useBusinessPacks(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.shopId).toBe('shop-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.handleDeactivate('pack-1')
    })

    expect(packChain.update).toHaveBeenCalledWith({ is_active: false, deleted_at: expect.any(String) })
  })
})
