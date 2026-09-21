import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAdminPacks, AdminPackRow } from '@/components/admin/useAdminPacks'
import { supabaseBrowser } from '@/lib/supabase/client'

/**
 * Contrato del listado de packs del panel (ADMIN-2): la RPC canónica
 * `list_admin_packs` (0032) con p_limit 200 (guard 1..500). Si alguien
 * cambia el nombre o el límite aquí, estos tests lo cacen antes de prod.
 */

/** Fila canónica de list_admin_packs (0032), como la devuelve staging. */
function adminPackRow(overrides: Partial<AdminPackRow> = {}): AdminPackRow {
  return {
    pack_id: 'pack-1',
    shop_id: 'shop-1',
    shop_name: 'Panadería Staging A',
    title: 'Pack Sorpresa de Panadería',
    description: 'Selección del día',
    category: 'panaderia',
    price_minor: 4500,
    original_price_minor: 9000,
    currency_code: 'CLP',
    total_stock: 15,
    remaining_stock: 12,
    status: 'active',
    pickup_start_at: '2026-09-30T23:00:00Z',
    pickup_end_at: '2026-10-01T00:30:00Z',
    timezone_snapshot: 'America/Santiago',
    image_path: null,
    created_at: '2026-09-25T10:00:00Z',
    updated_at: '2026-09-25T10:00:00Z',
    ...overrides,
  }
}

let rpc: ReturnType<typeof vi.fn>

function setupMockClient(rows: AdminPackRow[], error: { message: string; code?: string } | null = null) {
  rpc = vi.fn().mockResolvedValue({ data: rows, error })
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

describe('useAdminPacks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('llama a list_admin_packs con p_limit 200 y expone las columnas canónicas', async () => {
    setupMockClient([adminPackRow()])
    const { result } = renderHook(() => useAdminPacks(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(rpc).toHaveBeenCalledWith('list_admin_packs', { p_limit: 200 })
    expect(result.current.packs).toEqual([adminPackRow()])
    expect(result.current.error).toBe('')
  })

  it('con data null devuelve lista vacía sin romper', async () => {
    rpc = vi.fn().mockResolvedValue({ data: null, error: null })
    ;(supabaseBrowser as unknown as { mockReturnValue: (v: unknown) => void }).mockReturnValue({
      rpc,
      from: vi.fn(),
    })
    const { result } = renderHook(() => useAdminPacks(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.packs).toEqual([])
    expect(result.current.error).toBe('')
  })

  it('traduce a español el error de la RPC', async () => {
    setupMockClient([], { message: 'ADMIN_REQUIRED', code: '42501' })
    const { result } = renderHook(() => useAdminPacks(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.error).toBe('Esta acción requiere permisos de administrador.'))
  })
})
