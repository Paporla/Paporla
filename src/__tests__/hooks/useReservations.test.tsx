import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useReservations } from '@/hooks/useReservations'
import { supabaseBrowser } from '@/lib/supabase/client'

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

const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockOrder = vi.fn()
const mockRpc = vi.fn()
const mockFrom = vi.fn()

function setupMockClient() {
  mockSelect.mockReturnThis()
  mockEq.mockReturnThis()
  mockOrder.mockResolvedValue({ data: [], error: null })
  mockRpc.mockResolvedValue({ data: { success: true, reservation_id: 'r-1' }, error: null })
  mockFrom.mockImplementation((table: string) => {
    if (table === 'reservations') {
      return {
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
      }
    }
    return {}
  })
  ;(supabaseBrowser as any).mockReturnValue({
    from: mockFrom,
    rpc: mockRpc,
  })
}

describe('useReservations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMockClient()
  })

  it('starts with empty reservations and loading false when enabled', () => {
    const { result } = renderHook(() => useReservations(), { wrapper: createWrapper() })
    expect(result.current.reservations).toEqual([])
  })

  it('fetches reservations when user is present', async () => {
    const mockData = [{ id: 'r-1', status: 'confirmed', pack: { title: 'Pack 1' }, shop: { name: 'Shop 1' } }]
    mockOrder.mockResolvedValue({ data: mockData, error: null })

    const { result } = renderHook(() => useReservations(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.reservations).toEqual(mockData)
  })

  it('calls createReservation RPC and invalidates query', async () => {
    const { result } = renderHook(() => useReservations(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.createReservation({ packId: 'pack-1', quantity: 1 })
    })

    expect(mockRpc).toHaveBeenCalledWith('create_reservation_atomic', {
      p_pack_id: 'pack-1',
      p_quantity: 1,
      p_payment_method: 'demo',
    })
    await waitFor(() => {
      expect(mockOrder).toHaveBeenCalled()
    })
  })

  it('throws on createReservation when RPC returns error', async () => {
    mockRpc.mockResolvedValue({ data: { success: false, error: 'No stock' }, error: null })
    const { result } = renderHook(() => useReservations(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(
      act(async () => {
        await result.current.createReservation({ packId: 'pack-1' })
      }),
    ).rejects.toThrow('No stock')
  })

  it('calls cancelReservation RPC', async () => {
    mockRpc.mockResolvedValue({ data: { success: true }, error: null })
    const { result } = renderHook(() => useReservations(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.cancelReservation({ reservationId: 'r-1', reason: 'changed mind' })
    })

    expect(mockRpc).toHaveBeenCalledWith('cancel_reservation', {
      p_reservation_id: 'r-1',
      p_cancel_reason: 'changed mind',
    })
  })

  it('calls validatePickup RPC', async () => {
    mockRpc.mockResolvedValue({ data: { success: true }, error: null })
    const { result } = renderHook(() => useReservations(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.validatePickup('CODE123')
    })

    expect(mockRpc).toHaveBeenCalledWith('validate_pickup', { p_pickup_code: 'CODE123' })
  })
})
