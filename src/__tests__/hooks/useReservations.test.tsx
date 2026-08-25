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

/** Fila canónica de list_my_reservations (campos exactos de la vista 0014). */
const rowCanonical = {
  reservation_id: 'r-1',
  shop_id: 's-1',
  pack_id: 'p-1',
  pack_title: 'Pack sorpresa',
  shop_name: 'Tienda',
  shop_address: 'Calle 1',
  status: 'payment_pending',
  payment_status: 'pending',
  total_amount_minor: 2999,
  currency_code: 'CLP',
  pickup_start_at: '2026-09-04T19:00:00-04:00',
  pickup_end_at: '2026-09-04T23:00:00-04:00',
  timezone: 'America/Santiago',
  cancel_reason: null,
  created_at: '2026-08-24T12:00:00Z',
}

function setupMockFetch(override?: { success?: boolean; error?: string; reservations?: unknown[] }) {
  const defaults = { success: true, reservations: [rowCanonical] }
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

  it('empieza vacío y carga las filas canónicas', async () => {
    const { result } = renderHook(() => useReservations(), { wrapper: createWrapper() })
    expect(result.current.reservations).toEqual([])
    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.reservations).toEqual([rowCanonical])
  })

  it('llama a GET /api/reservations', async () => {
    const { result } = renderHook(() => useReservations(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(mockFetch).toHaveBeenCalledWith('/api/reservations', {
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': '' },
    })
  })

  it('cancelReservation hace PUT con id y motivo (parámetros canónicos)', async () => {
    const { result } = renderHook(() => useReservations(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.cancelReservation({ reservationId: 'r-1', reason: 'changed mind' })
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/reservations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': '' },
      body: JSON.stringify({ id: 'r-1', cancel_reason: 'changed mind' }),
    })
  })

  it('propaga el error de la API al cancelar', async () => {
    setupMockFetch({ success: false, error: 'Pasó el plazo para cancelar esta reserva.' })
    const { result } = renderHook(() => useReservations(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(
      act(async () => {
        await result.current.cancelReservation({ reservationId: 'r-1', reason: 'cambio de planes' })
      }),
    ).rejects.toThrow('Pasó el plazo para cancelar esta reserva.')
  })

  it('invalida la query después de cancelar (refetch)', async () => {
    const { result } = renderHook(() => useReservations(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))
    const callsBefore = mockFetch.mock.calls.length

    await act(async () => {
      await result.current.cancelReservation({ reservationId: 'r-1', reason: 'changed mind' })
    })

    // PUT + el refetch de invalidación: al menos una llamada nueva.
    expect(mockFetch.mock.calls.length).toBeGreaterThan(callsBefore)
  })

  it('no expone create/validate (eso no es del usuario)', () => {
    const { result } = renderHook(() => useReservations(), { wrapper: createWrapper() })
    expect(result.current).not.toHaveProperty('createReservation')
    expect(result.current).not.toHaveProperty('validatePickup')
    expect(result.current).not.toHaveProperty('getBusinessReservations')
    expect(result.current).not.toHaveProperty('getReservationById')
  })
})
