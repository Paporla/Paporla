import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

/**
 * Página /admin/reservations (Fase 6.5, 0032): sobre la RPC canónica
 * list_admin_reservations. La página legacy hacía .from('reservations') con
 * un join shop:shops(name) que NO existe en el esquema (no hay FK directa
 * reservations→shops) y leía campos inexistentes (total_price_cents,
 * user_profiles.name). Aquí se protege:
 *  1. El nombre EXACTO de la RPC y su parámetro p_limit.
 *  2. El mapeo de filas: comercio y pack salen de las snapshots de la
 *     reserva (0005), el usuario de user_profiles (display_name, email).
 *  3. La ventana de recogida en la zona horaria de la reserva (Santiago),
 *     no la del navegador.
 *  4. El enum real de status (0005) en los badges.
 *  5. Los estados de error (mensaje traducido) y vacío.
 */

const mock = vi.hoisted(() => ({
  rpc: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ rpc: mock.rpc }),
}))

vi.mock('@/lib/auth/requireAuth', () => ({
  requireAuth: async () => ({ user: { id: 'admin-1' }, role: 'admin' }),
}))

const filaReserva = {
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
}

async function loadPage() {
  const mod = await import('@/app/(admin)/admin/reservations/page')
  render(await mod.default())
}

describe('/admin/reservations con list_admin_reservations (0032, Fase 6.5)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('llama a list_admin_reservations con p_limit 200 y pinta usuario/pack/comercio', async () => {
    mock.rpc.mockResolvedValue({ data: [filaReserva], error: null })
    await loadPage()
    expect(mock.rpc).toHaveBeenCalledWith('list_admin_reservations', { p_limit: 200 })
    expect(screen.getByText('Usuario A')).toBeInTheDocument()
    expect(screen.getByText('user.a.staging@paporla.test')).toBeInTheDocument()
    expect(screen.getByText('Pack Panadería Artesanal')).toBeInTheDocument()
    expect(screen.getByText('Panadería Staging A')).toBeInTheDocument()
  })

  it('mapea total_amount_minor (string de PostgREST) al precio CLP y el estado real al badge', async () => {
    mock.rpc.mockResolvedValue({ data: [filaReserva], error: null })
    await loadPage()
    expect(screen.getByText('$3.990')).toBeInTheDocument()
    expect(screen.getByText('Lista para recoger')).toBeInTheDocument()
  })

  it('pinta la ventana de recogida en la zona horaria de la reserva (Santiago)', async () => {
    // 18:00Z – 21:00Z = 15:00 – 18:00 America/Santiago.
    mock.rpc.mockResolvedValue({ data: [filaReserva], error: null })
    await loadPage()
    expect(screen.getByText(/15:00 – 18:00/)).toBeInTheDocument()
  })

  it('rpc en error: muestra el mensaje traducido (no el código crudo)', async () => {
    mock.rpc.mockResolvedValue({
      data: null,
      error: { message: 'INVALID_ADMIN_RESERVATIONS_PAGE_ARGUMENTS', code: '22023' },
    })
    await loadPage()
    expect(screen.getByText(/No se pudo cargar la página de reservas/)).toBeInTheDocument()
  })

  it('sin reservas: estado vacío', async () => {
    mock.rpc.mockResolvedValue({ data: [], error: null })
    await loadPage()
    expect(screen.getByText('No hay reservas registradas')).toBeInTheDocument()
  })
})
