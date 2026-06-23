import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { usePacks } from '@/hooks/usePacks'

const API_BASE = 'http://localhost:3000'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

function mockFetchSuccess(data: unknown) {
  return Promise.resolve(new Response(JSON.stringify({ success: true, packs: data }), { status: 200 }))
}

describe('usePacks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('starts with empty packs', () => {
    const { result } = renderHook(() => usePacks(), { wrapper: createWrapper() })
    expect(result.current.packs).toEqual([])
  })

  it('fetches packs without shopId filter', async () => {
    const mockData = [{ id: 'p-1', title: 'Pack 1', shop: { name: 'Shop 1' } }]
    vi.mocked(global.fetch).mockResolvedValue(mockFetchSuccess(mockData))

    const { result } = renderHook(() => usePacks(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.packs).toEqual(mockData)
    expect(global.fetch).toHaveBeenCalledWith(`${API_BASE}/api/packs`)
  })

  it('fetches packs with shopId filter', async () => {
    vi.mocked(global.fetch).mockResolvedValue(mockFetchSuccess([]))

    const { result } = renderHook(() => usePacks('shop-1'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(global.fetch).toHaveBeenCalledWith(`${API_BASE}/api/packs?shopId=shop-1`)
  })

  it('returns error when query fails', async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error('DB error'))

    const { result } = renderHook(() => usePacks(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.error).toBe('DB error'))
  })

  it('getPackById fetches single pack', async () => {
    const mockPack = { id: 'p-1', title: 'Pack 1', shop: { name: 'Shop 1' } }
    // Usamos mockImplementation para que cada llamada a fetch cree un Response nuevo
    vi.mocked(global.fetch).mockImplementation((url: string) => {
      if (url.includes('id=')) {
        return Promise.resolve(new Response(JSON.stringify({ success: true, pack: mockPack }), { status: 200 }))
      }
      return Promise.resolve(new Response(JSON.stringify({ success: true, packs: [] }), { status: 200 }))
    })

    const { result } = renderHook(() => usePacks(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))

    const pack = await result.current.getPackById('p-1')
    expect(pack).toEqual(mockPack)
    expect(global.fetch).toHaveBeenCalledWith(`${API_BASE}/api/packs?id=p-1`)
  })
})
