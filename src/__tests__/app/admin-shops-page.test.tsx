import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AdminShopsPage from '@/app/(admin)/admin/shops/page'
import { supabaseBrowser } from '@/lib/supabase/client'
import { AdminShop } from '@/components/admin/useAdminShops'

// El hook de listado y el de contadores son el contrato de la página: se
// mockean por completo; solo la RPC de moderación (admin_review_shop) se
// prueba a través del cliente real mockeado.
const hooksState = vi.hoisted(() => ({
  shops: [] as unknown[],
  loading: false,
  shopsError: '',
  counts: {
    users: 1,
    shops: 3,
    packs: 2,
    reservations: 3,
    verifiedShops: 1,
    bannedShops: 1,
    pendingShops: 1,
    byStatus: {} as Record<string, number>,
  },
}))

const useAdminShopsMock = vi.hoisted(() => vi.fn())
const useAdminCountsMock = vi.hoisted(() => vi.fn())

vi.mock('@/components/admin/useAdminShops', () => ({
  useAdminShops: useAdminShopsMock,
}))
vi.mock('@/lib/query/useAdminCounts', () => ({
  useAdminCounts: useAdminCountsMock,
}))

let rpc: ReturnType<typeof vi.fn>

function setupSupabase(error: { message: string; code?: string } | null = null) {
  rpc = vi.fn().mockResolvedValue({ data: { ok: true }, error })
  ;(supabaseBrowser as unknown as { mockReturnValue: (v: unknown) => void }).mockReturnValue({
    rpc,
    from: vi.fn(),
  })
}

function shopRow(overrides: Partial<AdminShop> = {}): AdminShop {
  return {
    shop_id: 'shop-1',
    owner_id: 'owner-1',
    owner_name: 'Dueño Uno',
    owner_email: 'dueno@paporla.test',
    name: 'Panadería Staging A',
    description: null,
    category: null,
    status: 'verified',
    status_reason: null,
    address_line1: 'Av. Siempre Viva 742',
    phone_e164: '+56912345678',
    logo_path: null,
    tax_id: '12345678-5',
    sanitary_resolution: 'RS N° 12345/2026 SEREMI RM',
    reviewed_at: '2026-08-25T10:00:00Z',
    created_at: '2026-08-20T10:00:00Z',
    updated_at: '2026-08-25T10:00:00Z',
    ...overrides,
  }
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('AdminShopsPage (página)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    hooksState.shops = [
      shopRow(),
      shopRow({ shop_id: 'shop-2', name: 'Café Prueba', status: 'pending_review' }),
      shopRow({
        shop_id: 'shop-3',
        name: 'Bocadones Rápidos',
        status: 'suspended',
        status_reason: 'Reclamos de higiene',
      }),
    ]
    hooksState.loading = false
    hooksState.shopsError = ''
    hooksState.counts = {
      users: 1,
      shops: 3,
      packs: 2,
      reservations: 3,
      verifiedShops: 1,
      bannedShops: 1,
      pendingShops: 1,
      byStatus: { verified: 1, pending_review: 1, suspended: 1 },
    }
    useAdminShopsMock.mockImplementation(() => ({
      shops: hooksState.shops as AdminShop[],
      loading: hooksState.loading,
      error: hooksState.shopsError,
    }))
    useAdminCountsMock.mockImplementation(() => ({ data: hooksState.counts, isLoading: false }))
    setupSupabase()
  })

  const renderPage = () => render(<AdminShopsPage />, { wrapper: createWrapper() })

  it('muestra los comercios con su estado real y los 7 chips de filtro (todas + 6 estados)', () => {
    renderPage()
    expect(screen.getByText('Panadería Staging A')).toBeTruthy()
    expect(screen.getByText('Café Prueba')).toBeTruthy()
    expect(screen.getByText('Bocadones Rápidos')).toBeTruthy()
    // Badges desde shop.status real (no los booleanos legacy verificados/baneados)
    expect(screen.getByText('Verificado')).toBeTruthy()
    expect(screen.getByText('Pendiente de revisión')).toBeTruthy()
    expect(screen.getByText('Suspendido')).toBeTruthy()
    expect(screen.getByText('Reclamos de higiene')).toBeTruthy()
    // 7 chips con sus contadores (byStatus de admin_counts)
    expect(screen.getByRole('button', { name: 'Todas (3)' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Borrador (0)' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Pendiente de revisión (1)' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Verificado (1)' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Rechazado (0)' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Suspendido (1)' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Cerrado (0)' })).toBeTruthy()
  })

  it('clic en un chip de estado filtra pidiendo al hook ese estado', () => {
    renderPage()
    expect(useAdminShopsMock).toHaveBeenLastCalledWith(null)
    fireEvent.click(screen.getByRole('button', { name: 'Pendiente de revisión (1)' }))
    expect(useAdminShopsMock).toHaveBeenLastCalledWith('pending_review')
  })

  it('busca por nombre en el cliente (volumen de piloto)', () => {
    renderPage()
    fireEvent.change(screen.getByPlaceholderText('Buscar por nombre...'), { target: { value: 'caf' } })
    expect(screen.getByText('Café Prueba')).toBeTruthy()
    expect(screen.queryByText('Panadería Staging A')).toBeNull()
    expect(screen.queryByText('Bocadones Rápidos')).toBeNull()
  })

  it('el modal de un comercio verificado ofrece Rechazar y Suspender, no Verificar', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Moderar Panadería Staging A' }))
    expect(screen.getByText('Moderar comercio')).toBeTruthy()
    expect(screen.getByText('Rechazar comercio')).toBeTruthy()
    expect(screen.getByText('Suspender comercio')).toBeTruthy()
    expect(screen.queryByText('Verificar comercio')).toBeNull()
  })

  it('motivo de menos de 3 caracteres: Confirmar deshabilitado y explicación visible (F2b)', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Moderar Café Prueba' }))
    fireEvent.click(screen.getByText('Suspender comercio'))
    fireEvent.change(screen.getByLabelText('Motivo (obligatorio)'), { target: { value: 'ab' } })
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeDisabled()
    expect(screen.getByText('Mínimo 3 caracteres (la base lo exige).')).toBeTruthy()
  })

  it('motivo válido llama a admin_review_shop con p_shop_id, p_new_status y p_reason', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Moderar Café Prueba' }))
    fireEvent.click(screen.getByText('Suspender comercio'))
    fireEvent.change(screen.getByLabelText('Motivo (obligatorio)'), {
      target: { value: 'Reclamos repetidos de clientes' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
    await waitFor(() => {
      expect(rpc).toHaveBeenCalledWith('admin_review_shop', {
        p_shop_id: 'shop-2',
        p_new_status: 'suspended',
        p_reason: 'Reclamos repetidos de clientes',
      })
    })
    expect(await screen.findByText('Comercio suspendido')).toBeTruthy()
    // Éxito: el modal se cierra.
    await waitFor(() => expect(screen.queryByText('Moderar comercio')).toBeNull())
  })

  it('el error de la RPC se traduce, el modal se queda abierto y avisa con toast', async () => {
    setupSupabase({ message: 'SHOP_NOT_FOUND', code: 'P0002' })
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Moderar Bocadones Rápidos' }))
    fireEvent.click(screen.getByText('Verificar comercio'))
    fireEvent.change(screen.getByLabelText('Motivo (obligatorio)'), {
      target: { value: 'Revisado, aprobado' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(await screen.findByText('No se encontró el comercio.')).toBeTruthy()
    // Error: el modal sigue abierto para reintentar.
    expect(screen.getByText('Moderar comercio')).toBeTruthy()
  })

  it('no hay botones de banear/eliminar en la tabla: una sola acción por fila (moderar)', () => {
    renderPage()
    expect(screen.getAllByRole('button', { name: /^Moderar / })).toHaveLength(3)
    expect(screen.queryByRole('button', { name: /eliminar/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /banear/i })).toBeNull()
  })
})
