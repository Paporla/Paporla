import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

/**
 * Página /admin/packs (Fase 6.5, 0032): sobre la RPC canónica
 * list_admin_packs. La página legacy hacía .from('packs') directo, que el
 * esquema deniega ("permission denied for table packs"), y leía campos
 * inexistentes (price_cents, is_active). Aquí se protege:
 *  1. El nombre EXACTO de la RPC y su parámetro p_limit.
 *  2. El mapeo de filas: price_minor viaja como STRING por PostgREST (bigint)
 *     y el precio debe pintarse con el formato CLP del piloto ($3.990).
 *  3. El enum real de status (0004) en los badges.
 *  4. Los estados de error (mensaje traducido) y vacío.
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

const filaPack = {
  pack_id: 'pack-1',
  shop_id: 'shop-1',
  shop_name: 'Panadería Staging A',
  title: 'Pack Panadería Artesanal',
  description: null,
  category: 'panaderia',
  price_minor: '3990',
  original_price_minor: null,
  currency_code: 'CLP',
  total_stock: 5,
  remaining_stock: 3,
  status: 'active',
  pickup_start_at: '2026-09-30T18:00:00Z',
  pickup_end_at: '2026-09-30T21:00:00Z',
  timezone_snapshot: 'America/Santiago',
  image_path: null,
  created_at: '2026-09-25T10:00:00Z',
  updated_at: '2026-09-25T10:00:00Z',
}

async function loadPage() {
  const mod = await import('@/app/(admin)/admin/packs/page')
  render(await mod.default())
}

describe('/admin/packs con list_admin_packs (0032, Fase 6.5)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('llama a list_admin_packs con p_limit 200 y pinta las filas', async () => {
    mock.rpc.mockResolvedValue({ data: [filaPack], error: null })
    await loadPage()
    expect(mock.rpc).toHaveBeenCalledWith('list_admin_packs', { p_limit: 200 })
    expect(screen.getByText('Pack Panadería Artesanal')).toBeInTheDocument()
    expect(screen.getByText('Panadería Staging A')).toBeInTheDocument()
    expect(screen.getByText('3/5')).toBeInTheDocument()
  })

  it('mapea price_minor (string de PostgREST) al precio formateado CLP', async () => {
    mock.rpc.mockResolvedValue({ data: [filaPack], error: null })
    await loadPage()
    expect(screen.getByText('$3.990')).toBeInTheDocument()
  })

  it('mapea los estados reales al badge (active → Activo, sold_out → Agotado)', async () => {
    mock.rpc.mockResolvedValue({
      data: [{ ...filaPack, pack_id: 'pack-2', status: 'sold_out', remaining_stock: 0 }, filaPack],
      error: null,
    })
    await loadPage()
    expect(screen.getByText('Activo')).toBeInTheDocument()
    expect(screen.getByText('Agotado')).toBeInTheDocument()
  })

  it('rpc en error: muestra el mensaje traducido (no el código crudo)', async () => {
    mock.rpc.mockResolvedValue({
      data: null,
      error: { message: 'INVALID_ADMIN_PACKS_PAGE_ARGUMENTS', code: '22023' },
    })
    await loadPage()
    expect(screen.getByText(/No se pudo cargar la página de packs/)).toBeInTheDocument()
  })

  it('sin packs: estado vacío', async () => {
    mock.rpc.mockResolvedValue({ data: [], error: null })
    await loadPage()
    expect(screen.getByText('No hay packs registrados')).toBeInTheDocument()
  })
})
