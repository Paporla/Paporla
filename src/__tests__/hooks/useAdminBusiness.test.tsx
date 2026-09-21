import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAdminBusiness, AdminBusinessSnapshot } from '@/components/admin/useAdminBusiness'
import { supabaseBrowser } from '@/lib/supabase/client'

/**
 * Contrato de los números de negocio del Overview (ADMIN-3): la RPC
 * `admin_business_snapshot` (0055), SIN argumentos (agregado completo en
 * SQL). Si alguien le pasa parámetros o cambia el nombre, esto lo caza.
 */

export function snapshot(overrides: Partial<AdminBusinessSnapshot> = {}): AdminBusinessSnapshot {
  return {
    paid_count: 5,
    revenue_minor: 19950,
    units_saved: 3,
    cancelled_count: 1,
    no_show_count: 0,
    total_count: 6,
    cancel_rate: 16.7,
    packs_active: 4,
    packs_paused: 1,
    currency: 'CLP',
    ...overrides,
  }
}

let rpc: ReturnType<typeof vi.fn>

function setupMockClient(data: AdminBusinessSnapshot | null, error: { message: string; code?: string } | null = null) {
  rpc = vi.fn().mockResolvedValue({ data, error })
  ;(supabaseBrowser as unknown as { mockReturnValue: (v: unknown) => void }).mockReturnValue({
    rpc,
    from: vi.fn(),
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

describe('useAdminBusiness', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('llama a admin_business_snapshot sin argumentos y expone el snapshot', async () => {
    setupMockClient(snapshot())
    const { result } = renderHook(() => useAdminBusiness(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(rpc).toHaveBeenCalledWith('admin_business_snapshot')
    expect(result.current.business).toEqual(snapshot())
    expect(result.current.business?.revenue_minor).toBe(19950)
    expect(result.current.business?.units_saved).toBe(3)
    expect(result.current.business?.cancel_rate).toBe(16.7)
    expect(result.current.error).toBe('')
  })

  it('con data null expone business null sin romper', async () => {
    setupMockClient(null)
    const { result } = renderHook(() => useAdminBusiness(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.business).toBeNull()
    expect(result.current.error).toBe('')
  })

  it('traduce a español el error de la RPC', async () => {
    setupMockClient(null, { message: 'ADMIN_REQUIRED', code: '42501' })
    const { result } = renderHook(() => useAdminBusiness(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.error).toBe('Esta acción requiere permisos de administrador.'))
  })
})
