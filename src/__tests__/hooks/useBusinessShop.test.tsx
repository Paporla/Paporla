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

let rpc: ReturnType<typeof vi.fn>

function setupMockClient() {
  rpc = vi.fn().mockResolvedValue({ data: null, error: null })
  ;(supabaseBrowser as any).mockReturnValue({ rpc })
}

describe('useBusinessShop', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMockClient()
    mockUseAuth.mockReturnValue({ user: { id: 'user-1', name: 'Test' } })
  })

  it('loads shop via get_my_shop when user is present', async () => {
    rpc.mockResolvedValue({
      data: {
        shop: {
          id: 'shop-1',
          name: 'Mi Tienda',
          status: 'verified',
          logo_path: null,
          description: null,
          address_line1: null,
          phone_e164: null,
          latitude: null,
          longitude: null,
          locality_id: '10000000-0000-4000-8000-000000000101',
        },
      },
      error: null,
    })

    const { result } = renderHook(() => useBusinessShop(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(rpc).toHaveBeenCalledWith('get_my_shop')
    expect(result.current.data).toMatchObject({
      id: 'shop-1',
      name: 'Mi Tienda',
      verified: true,
      status: 'verified',
    })
  })

  it('returns null when no shop exists for user', async () => {
    rpc.mockResolvedValue({ data: null, error: null })

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
    rpc.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const { result } = renderHook(() => useBusinessShop(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
