import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAdminTrend } from '@/components/admin/useAdminTrend'
import { supabaseBrowser } from '@/lib/supabase/client'
import { translateDbError } from '@/lib/utils/db-errors'

/**
 * useAdminTrend (Fase 6.5, 0032): la RPC admin_dashboard_trend alimenta los
 * tres gráficos del dashboard que antes hacían .from('reservations') directo
 * (denegado por el esquema 0012). Aquí se protege el nombre exacto de la
 * RPC (sin argumentos) y el mapeo del payload jsonb.
 */

const mockRpc = vi.fn()

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

const payloadCompleto = {
  reservations_by_day: [
    { day: '08-26', count: 3 },
    { day: '08-27', count: 1 },
  ],
  revenue_by_month: [{ month: '2026-08', revenue_minor: 3990, commissions_minor: 399, count: 1 }],
  top_shops: [{ shop_id: 'shop-1', name: 'Panadería Staging A', reservations: 4 }],
  currency_code: 'CLP',
}

describe('useAdminTrend (Fase 6.5, 0032)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: payloadCompleto, error: null })
    ;(supabaseBrowser as any).mockReturnValue({ rpc: mockRpc })
  })

  it('llama a la RPC admin_dashboard_trend sin argumentos', async () => {
    renderHook(() => useAdminTrend(), { wrapper: createWrapper() })
    await waitFor(() => expect(mockRpc).toHaveBeenCalledWith('admin_dashboard_trend'))
  })

  it('devuelve las series tal como las devuelve la RPC', async () => {
    const { result } = renderHook(() => useAdminTrend(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(payloadCompleto)
  })

  it('con payload vacío devuelve arrays vacíos sin romper', async () => {
    mockRpc.mockResolvedValue({
      data: { reservations_by_day: [], revenue_by_month: [], top_shops: [], currency_code: 'CLP' },
      error: null,
    })
    const { result } = renderHook(() => useAdminTrend(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({
      reservations_by_day: [],
      revenue_by_month: [],
      top_shops: [],
      currency_code: 'CLP',
    })
  })

  it('con error de la RPC lanza el mensaje traducido', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'ADMIN_REQUIRED', code: '42501' } })
    const { result } = renderHook(() => useAdminTrend(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe(translateDbError({ message: 'ADMIN_REQUIRED', code: '42501' }))
  })
})
