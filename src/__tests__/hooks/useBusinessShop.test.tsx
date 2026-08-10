import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useBusinessShop } from '@/lib/query/useBusinessShop'
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

let shopChain: any

function setupMockClient() {
  shopChain = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  }
  shopChain.select.mockReturnValue(shopChain)
  shopChain.eq.mockReturnValue(shopChain)
  ;(supabaseBrowser as any).mockReturnValue({
    from: vi.fn((table: string) => {
      if (table === 'shops') return shopChain
      return {}
    }),
  })
}

describe('useBusinessShop', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMockClient()
    mockUseAuth.mockReturnValue({ user: { id: 'user-1', name: 'Test' } })
  })

  it('queries shops by owner_id when user is present', async () => {
    const shopData = { id: 'shop-1', name: 'Mi Tienda', verified: true }
    shopChain.maybeSingle.mockResolvedValue({ data: shopData, error: null })

    const { result } = renderHook(() => useBusinessShop(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(shopChain.eq).toHaveBeenCalledWith('owner_id', 'user-1')
    expect(result.current.data).toEqual(shopData)
  })

  it('returns null when no shop exists for user', async () => {
    shopChain.maybeSingle.mockResolvedValue({ data: null, error: null })

    const { result } = renderHook(() => useBusinessShop(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeNull()
  })

  it('does not fetch when user is null', () => {
    mockUseAuth.mockReturnValue({ user: null })

    const { result } = renderHook(() => useBusinessShop(), { wrapper: createWrapper() })

    expect(result.current.fetchStatus).toBe('idle')
  })

  it('throws on query error', async () => {
    shopChain.maybeSingle.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const { result } = renderHook(() => useBusinessShop(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
