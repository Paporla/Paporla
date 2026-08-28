import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAdminCounts } from '@/lib/query/useAdminCounts'
import { translateDbError } from '@/lib/utils/db-errors'
import { supabaseBrowser } from '@/lib/supabase/client'

/**
 * FASE 6.6: el helper de timeout corre con 50 ms en tests (no los 30 s
 * reales) para probar el caso "la RPC no responde" sin esperar.
 */
vi.mock('@/lib/utils/rpcWithTimeout', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils/rpcWithTimeout')>()
  type CallArg = Parameters<(typeof actual)['rpcWithTimeout']>[0]
  return {
    ...actual,
    rpcWithTimeout: (call: CallArg, rpcName: string) => actual.rpcWithTimeout(call, rpcName, 50),
  }
})

let rpc: ReturnType<typeof vi.fn>

function setupMockClient(data: unknown, error: { message: string; code?: string } | null = null) {
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

describe('useAdminCounts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('carga los contadores con la RPC canónica admin_counts (no .select sobre shops)', async () => {
    setupMockClient({
      users: 10,
      packs: 20,
      reservations: 100,
      shops: { total: 5, by_status: { verified: 3 } },
    })
    const { result } = renderHook(() => useAdminCounts(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(rpc).toHaveBeenCalledWith('admin_counts')
  })

  it('mapea by_status a la forma legacy: banned=suspended y pending=draft+pending_review', async () => {
    setupMockClient({
      users: 10,
      packs: 20,
      reservations: 100,
      shops: { total: 5, by_status: { verified: 3, suspended: 1, draft: 1, pending_review: 0 } },
    })
    const { result } = renderHook(() => useAdminCounts(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({
      users: 10,
      shops: 5,
      packs: 20,
      reservations: 100,
      verifiedShops: 3,
      bannedShops: 1,
      pendingShops: 1,
      byStatus: { verified: 3, suspended: 1, draft: 1, pending_review: 0 },
    })
  })

  it('con by_status vacía los sub-contadores de comercios son 0 (no NaN)', async () => {
    setupMockClient({ users: 1, packs: 2, reservations: 3, shops: { total: 0, by_status: {} } })
    const { result } = renderHook(() => useAdminCounts(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toMatchObject({
      users: 1,
      shops: 0,
      packs: 2,
      reservations: 3,
      verifiedShops: 0,
      bannedShops: 0,
      pendingShops: 0,
      byStatus: {},
    })
  })

  it('traduce ADMIN_REQUIRED a mensaje para el usuario', async () => {
    setupMockClient(null, { message: 'ADMIN_REQUIRED', code: '42501' })
    const { result } = renderHook(() => useAdminCounts(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(translateDbError(result.current.error)).toBe('Esta acción requiere permisos de administrador.')
  })

  it('Fase 6.6: si la RPC no responde, entra en error por timeout (no carga para siempre)', async () => {
    setupMockClient(null)
    rpc.mockImplementation(() => new Promise(() => {}))
    const { result } = renderHook(() => useAdminCounts(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 2000 })
    expect(result.current.error?.message).toContain('tardó demasiado')
  })
})
