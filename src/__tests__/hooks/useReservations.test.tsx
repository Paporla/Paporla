import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useReservations } from '@/hooks/useReservations'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'user-1', name: 'Test' } })),
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

const mockFetch = vi.fn()

function setupMockFetch(override?: Partial<{ reservations: unknown[]; success: boolean; error: string }>) {
  const defaults = { success: true, reservations: [] }
  const response = { ...defaults, ...override }
  mockFetch.mockResolvedValue({
    json: () => Promise.resolve(response),
  })
  globalThis.fetch = mockFetch as unknown as typeof fetch
}

describe('useReservations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMockFetch()
  })

  it('starts with empty reservations and loading false when enabled', () => {
    const { result } = renderHook(() => useReservations(), { wrapper: createWrapper() })
    expect(result.current.reservations).toEqual([])
  })

  it('fetches reservations when user is present', async () => {
    const mockData = [{ id: 'r-1', status: 'confirmed', pack: { title: 'Pack 1' }, shop: { name: 'Shop 1' } }]
    setupMockFetch({ reservations: mockData })

    const { result } = renderHook(() => useReservations(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.reservations).toEqual(mockData)
  })

  it('calls createReservation API and invalidates query', async () => {
    setupMockFetch()
    const { result } = renderHook(() => useReservations(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.createReservation({ packId: 'pack-1', shopId: 'shop-1', quantity: 1 })
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pack_id: 'pack-1', shop_id: 'shop-1', quantity: 1 }),
    })
  })

  it('throws on createReservation when API returns error', async () => {
    setupMockFetch({ success: false, error: 'No stock' })
    const { result } = renderHook(() => useReservations(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(
      act(async () => {
        await result.current.createReservation({ packId: 'pack-1', shopId: 'shop-1' })
      }),
    ).rejects.toThrow('No stock')
  })

  it('calls cancelReservation API', async () => {
    setupMockFetch()
    const { result } = renderHook(() => useReservations(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.cancelReservation({ reservationId: 'r-1', reason: 'changed mind' })
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/reservations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'r-1', status: 'cancelled', cancel_reason: 'changed mind' }),
    })
  })

  it('calls validatePickup API', async () => {
    setupMockFetch()
    const { result } = renderHook(() => useReservations(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.validatePickup('CODE123')
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/reservations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: '', status: 'validate_pickup', pickup_code: 'CODE123' }),
    })
  })
})
