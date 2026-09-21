import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAdminReservations, AdminReservationRow } from '@/components/admin/useAdminReservations'
import { supabaseBrowser } from '@/lib/supabase/client'

/**
 * Contrato del listado de reservas del panel (ADMIN-1): la RPC canónica
 * `list_admin_reservations` (0032) con p_limit 500 (el máximo que acepta la
 * RPC, cuyo guard vence en 501). Si alguien cambia el nombre o el límite
 * aquí, estos tests lo cacen antes de producción.
 */

/** Fila canónica de list_admin_reservations (0032), como la devuelve staging. */
function adminReservationRow(overrides: Partial<AdminReservationRow> = {}): AdminReservationRow {
  return {
    reservation_id: 'res-1',
    user_id: 'user-a',
    user_name: 'Usuario A',
    user_email: 'user.a.staging@paporla.test',
    shop_id: 'shop-1',
    shop_name: 'Panadería Staging A',
    shop_address: 'Calle Los Aromos 123',
    pack_title: 'Pack Panadería Artesanal',
    total_amount_minor: '3990',
    currency_code: 'CLP',
    status: 'ready_pickup',
    payment_status: 'paid',
    pickup_start_at: '2026-09-30T18:00:00Z',
    pickup_end_at: '2026-09-30T21:00:00Z',
    timezone_snapshot: 'America/Santiago',
    created_at: '2026-09-25T10:00:00Z',
    updated_at: '2026-09-25T10:00:00Z',
    ...overrides,
  }
}

let rpc: ReturnType<typeof vi.fn>

function setupMockClient(rows: AdminReservationRow[], error: { message: string; code?: string } | null = null) {
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

describe('useAdminReservations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('llama a list_admin_reservations con p_limit 500 y expone las columnas canónicas', async () => {
    setupMockClient([adminReservationRow()])
    const { result } = renderHook(() => useAdminReservations(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(rpc).toHaveBeenCalledWith('list_admin_reservations', { p_limit: 500 })
    expect(result.current.reservations).toEqual([adminReservationRow()])
    expect(result.current.error).toBe('')
  })

  it('con data null devuelve lista vacía sin romper', async () => {
    setupMockClient([])
    rpc = vi.fn().mockResolvedValue({ data: null, error: null })
    ;(supabaseBrowser as unknown as { mockReturnValue: (v: unknown) => void }).mockReturnValue({
      rpc,
      from: vi.fn(),
    })
    const { result } = renderHook(() => useAdminReservations(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.reservations).toEqual([])
    expect(result.current.error).toBe('')
  })

  it('traduce a español el error de la RPC', async () => {
    setupMockClient([], { message: 'ADMIN_REQUIRED', code: '42501' })
    const { result } = renderHook(() => useAdminReservations(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.error).toBe('Esta acción requiere permisos de administrador.'))
  })
})
