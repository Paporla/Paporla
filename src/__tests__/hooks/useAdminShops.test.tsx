import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAdminShops, AdminShop } from '@/components/admin/useAdminShops'
import { supabaseBrowser } from '@/lib/supabase/client'

/** Fila canónica de list_admin_shops (0027), como la devuelve staging. */
function adminShopRow(overrides: Partial<AdminShop> = {}): AdminShop {
  return {
    shop_id: 'shop-1',
    owner_id: 'owner-1',
    owner_name: 'Dueño Uno',
    owner_email: 'dueno@paporla.test',
    name: 'Panadería Staging A',
    description: 'Pan artesanal de masa madre',
    category: 'panaderia',
    status: 'pending_review',
    status_reason: null,
    address_line1: 'Av. Siempre Viva 742',
    phone_e164: '+56912345678',
    logo_path: null,
    tax_id: '12345678-5',
    sanitary_resolution: 'RS N° 12345/2026 SEREMI RM',
    reviewed_at: null,
    created_at: '2026-08-26T12:00:00Z',
    updated_at: '2026-08-26T12:00:00Z',
    ...overrides,
  }
}

let rpc: ReturnType<typeof vi.fn>

function setupMockClient(rows: AdminShop[], error: { message: string; code?: string } | null = null) {
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

describe('useAdminShops', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('llama a list_admin_shops sin filtro con límite 100 y expone las columnas canónicas', async () => {
    setupMockClient([adminShopRow()])
    const { result } = renderHook(() => useAdminShops(null), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(rpc).toHaveBeenCalledWith('list_admin_shops', {
      p_status: null,
      p_search: null,
      p_before_created_at: null,
      p_before_shop_id: null,
      p_limit: 100,
    })
    expect(result.current.shops).toEqual([adminShopRow()])
  })

  it('pasa el filtro de estado a p_status', async () => {
    setupMockClient([])
    const { result } = renderHook(() => useAdminShops('pending_review'), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(rpc).toHaveBeenCalledWith('list_admin_shops', {
      p_status: 'pending_review',
      p_search: null,
      p_before_created_at: null,
      p_before_shop_id: null,
      p_limit: 100,
    })
  })

  it('traduce a español el error de la RPC', async () => {
    setupMockClient([], { message: 'ADMIN_REQUIRED', code: '42501' })
    const { result } = renderHook(() => useAdminShops(null), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.error).toBe('Esta acción requiere permisos de administrador.'))
  })
})
