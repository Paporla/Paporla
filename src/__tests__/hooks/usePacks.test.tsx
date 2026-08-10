import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mocks hoisted para que vi.mock los vea
const { mockFrom, mockSelect, mockOrder, mockEq, mockMaybeSingle } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockSelect: vi.fn(),
  mockOrder: vi.fn(),
  mockEq: vi.fn(),
  mockMaybeSingle: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => ({
  supabaseBrowser: vi.fn(() => ({
    from: mockFrom,
  })),
}))

import { usePacks } from '@/hooks/usePacks'

/**
 * Crea un objeto que es a la vez encadenable (tiene .eq, .order, .maybeSingle)
 * y "thenable" (tiene .then para que await funcione).
 * Simula el comportamiento del query builder de Supabase.
 */
function chainable(result: { data: unknown; error: Error | null }) {
  const promise = Promise.resolve(result)
  return Object.assign(promise, {
    order: mockOrder,
    eq: mockEq,
    maybeSingle: mockMaybeSingle,
  })
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('usePacks', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Valor por defecto: éxito vacío
    const ok = { data: [], error: null }

    mockFrom.mockReturnValue({ select: mockSelect })
    mockSelect.mockReturnValue(chainable(ok))
    mockOrder.mockReturnValue(chainable(ok))
    mockEq.mockReturnValue(chainable(ok))
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
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
    // order() es el terminal en este caso → devuelve los datos
    mockOrder.mockReturnValue(chainable({ data: mockData, error: null }))

    const { result } = renderHook(() => usePacks(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.packs).toEqual(mockData)
    expect(mockFrom).toHaveBeenCalledWith('packs')
    expect(mockSelect).toHaveBeenCalled()
    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false })
  })

  it('fetches packs with shopId filter', async () => {
    const mockData = [{ id: 'p-2', title: 'Pack 2', shop: { name: 'Shop 2' } }]
    // eq() es el terminal en este caso
    mockEq.mockReturnValue(chainable({ data: mockData, error: null }))

    const { result } = renderHook(() => usePacks('shop-1'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.packs).toEqual(mockData)
    expect(mockFrom).toHaveBeenCalledWith('packs')
    expect(mockEq).toHaveBeenCalledWith('shop_id', 'shop-1')
  })

  it('returns error when query fails', async () => {
    mockOrder.mockReturnValue(chainable({ data: null, error: new Error('DB error') }))

    const { result } = renderHook(() => usePacks(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.error).toBe('DB error'))
  })

  it('getPackById fetches single pack', async () => {
    const mockPack = { id: 'p-1', title: 'Pack 1', shop: { name: 'Shop 1' } }
    // fetchPacks (sin shopId) → order es terminal, devuelve vacío
    mockOrder.mockReturnValue(chainable({ data: [], error: null }))
    // fetchPackById → maybeSingle es terminal, devuelve el pack
    mockMaybeSingle.mockResolvedValue({ data: mockPack, error: null })

    const { result } = renderHook(() => usePacks(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))

    const pack = await result.current.getPackById('p-1')
    expect(pack).toEqual(mockPack)
    expect(mockFrom).toHaveBeenCalledWith('packs')
    expect(mockEq).toHaveBeenCalledWith('id', 'p-1')
    expect(mockMaybeSingle).toHaveBeenCalled()
  })
})
