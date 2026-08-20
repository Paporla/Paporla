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

let rpc: ReturnType<typeof vi.fn>

function listed(title: string, status = 'active') {
  return {
    pack_id: title === 'Pack 1' ? 'p-1' : title === 'Pack 2' ? 'p-2' : 'p-x',
    title,
    status,
    price_minor: 3990,
    total_stock: 10,
    remaining_stock: 5,
    pickup_end_at: null,
  }
}

function setupMockClient(rows: ReturnType<typeof listed>[] = []) {
  rpc = vi.fn().mockImplementation((name: string) => {
    if (name === 'get_my_shop') {
      return Promise.resolve({
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
    }
    if (name === 'list_my_packs') {
      return Promise.resolve({ data: rows, error: null })
    }
    return Promise.resolve({ data: null, error: null })
  })
  ;(supabaseBrowser as any).mockReturnValue({ rpc, from: vi.fn() })
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
    setupMockClient([listed('Pack 1'), listed('Pack 2', 'draft')])
    const { result } = renderHook(() => useBusinessPacks(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.shopId).toBe('shop-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(rpc).toHaveBeenCalledWith('list_my_packs', {
      p_before_created_at: null,
      p_before_pack_id: null,
      p_limit: 50,
    })
    expect(result.current.packs.map((p) => p.title)).toEqual(['Pack 1', 'Pack 2'])
  })

  it('filters packs by search term', async () => {
    setupMockClient([
      { ...listed('Pan Artesanal'), pack_id: 'p-1' },
      { ...listed('Croissant'), pack_id: 'p-2' },
    ])
    const { result } = renderHook(() => useBusinessPacks(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => {
      result.current.setSearchTerm('pan')
    })
    expect(result.current.packs).toHaveLength(1)
    expect(result.current.packs[0].title).toBe('Pan Artesanal')
  })

  it('calls delete mutation and invalidates query', async () => {
    setupMockClient([])
    const { result } = renderHook(() => useBusinessPacks(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => {
      await result.current.handleDeactivate('pack-1')
    })
    expect(result.current.error).toMatch(/pausar|publicar/i)
  })
})
