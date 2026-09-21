import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AdminPacksPage from '@/app/(admin)/admin/packs/page'
import { supabaseBrowser } from '@/lib/supabase/client'
import { AdminPackRow } from '@/components/admin/useAdminPacks'

/**
 * Página /admin/packs (ADMIN-2): el interruptor de packs. El hook de listado
 * es el contrato de datos y se mockea (sus pruebas RPC viven en
 * src/__tests__/hooks/useAdminPacks.test.tsx). Aquí se protege:
 *  1. Tarjetas con pack/comercio/precio/stock y badge de estado.
 *  2. Solo 'active' muestra "Pausar" y solo 'paused' muestra "Reactivar";
 *     los demás estados no llevan botón.
 *  3. Chips de estado con conteo y búsqueda por pack/comercio.
 *  4. El modal exige motivo de 3+ y llama a admin_set_pack_status con los
 *     argumentos exactos; en éxito cierra + toast; en error traducido sigue.
 */

const hooksState = vi.hoisted(() => ({
  packs: [] as unknown[],
  loading: false,
  error: '',
}))

const useAdminPacksMock = vi.hoisted(() => vi.fn())

vi.mock('@/components/admin/useAdminPacks', () => ({
  useAdminPacks: useAdminPacksMock,
}))

function fila(overrides: Partial<AdminPackRow>): AdminPackRow {
  return {
    pack_id: 'pack-1',
    shop_id: 'shop-1',
    shop_name: 'Panadería La Esperanza',
    title: 'Pack Sorpresa de Panadería',
    description: null,
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

function setup() {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminPacksPage />
    </QueryClientProvider>,
  )
}

let rpc: ReturnType<typeof vi.fn>

describe('AdminPacksPage (ADMIN-2)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // mockImplementation (no mockReturnValue): lee el estado EN VIVO.
    useAdminPacksMock.mockImplementation(() => ({
      packs: hooksState.packs,
      loading: hooksState.loading,
      error: hooksState.error,
    }))
    rpc = vi.fn().mockResolvedValue({ data: { ok: true }, error: null })
    ;(supabaseBrowser as unknown as { mockReturnValue: (v: unknown) => void }).mockReturnValue({
      rpc,
      from: vi.fn(),
    })
  })

  it('muestra las tarjetas con pack, comercio, stock y badge de estado', () => {
    hooksState.packs = [
      fila({}),
      fila({ pack_id: 'pack-2', title: 'Pack Café', status: 'paused', remaining_stock: 5, total_stock: 10 }),
    ]
    setup()

    expect(screen.getByText('Pack Sorpresa de Panadería')).toBeTruthy()
    expect(screen.getByText('Pack Café')).toBeTruthy()
    // El comercio se repite en las dos tarjetas
    expect(screen.getAllByText('Panadería La Esperanza').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Stock: 12/15')).toBeTruthy()
    expect(screen.getByText('Stock: 5/10')).toBeTruthy()
    expect(screen.getByText('Activo')).toBeTruthy()
    expect(screen.getByText('Pausado')).toBeTruthy()
  })

  it('solo active muestra Pausar y solo paused muestra Reactivar', () => {
    hooksState.packs = [
      fila({}),
      fila({ pack_id: 'pack-2', title: 'Pack Café', status: 'paused' }),
      fila({ pack_id: 'pack-3', title: 'Pack Viejo', status: 'sold_out', remaining_stock: 0, total_stock: 10 }),
    ]
    setup()

    expect(screen.getByRole('button', { name: /Pausar/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Reactivar/ })).toBeTruthy()
    // sold_out no lleva botón de acción: solo existen los dos de arriba
    expect(screen.getAllByRole('button', { name: /Pausar|Reactivar/ })).toHaveLength(2)
  })

  it('los chips filtran por estado y la búsqueda por comercio', () => {
    hooksState.packs = [
      fila({}),
      fila({ pack_id: 'pack-2', title: 'Pack Café', shop_name: 'Café Verde', status: 'paused' }),
    ]
    setup()

    fireEvent.click(screen.getByRole('button', { name: 'Pausado (1)' }))
    expect(screen.getByText('1 de 2 packs')).toBeTruthy()
    expect(screen.queryByText('Pack Sorpresa de Panadería')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Todos (2)' }))
    fireEvent.change(screen.getByPlaceholderText(/Buscar por pack o comercio/), {
      target: { value: 'café verde' },
    })
    expect(screen.getByText('1 de 2 packs')).toBeTruthy()
    expect(screen.queryByText('Pack Sorpresa de Panadería')).toBeNull()
    expect(screen.getByText('Pack Café')).toBeTruthy()
  })

  it('pausar exige motivo 3+ y llama a admin_set_pack_status con los argumentos exactos', async () => {
    hooksState.packs = [fila({})]
    setup()

    fireEvent.click(screen.getByRole('button', { name: /Pausar/ }))
    // El título del modal y el botón de confirmar comparten texto
    expect(screen.getAllByText('Pausar pack').length).toBeGreaterThanOrEqual(1)

    const confirmar = screen.getByRole('button', { name: 'Pausar pack' })
    expect((confirmar as HTMLButtonElement).disabled).toBe(true)

    fireEvent.change(screen.getByPlaceholderText(/foto del pack/), {
      target: { value: 'Foto del pack no corresponde al producto' },
    })
    expect((confirmar as HTMLButtonElement).disabled).toBe(false)

    fireEvent.click(confirmar)

    await waitFor(() =>
      expect(rpc).toHaveBeenCalledWith('admin_set_pack_status', {
        p_pack_id: 'pack-1',
        p_action: 'pause',
        p_reason: 'Foto del pack no corresponde al producto',
      }),
    )
    // Éxito: modal cerrado + toast
    await waitFor(() => expect(screen.getByText('Pack pausado')).toBeTruthy())
  })

  it('si la RPC rechaza (ej: PACK_NOT_RESUMABLE) el error traducido queda en pantalla', async () => {
    rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'PACK_NOT_RESUMABLE', code: 'P0001' },
    })
    ;(supabaseBrowser as unknown as { mockReturnValue: (v: unknown) => void }).mockReturnValue({
      rpc,
      from: vi.fn(),
    })
    hooksState.packs = [fila({ status: 'paused' })]
    setup()

    fireEvent.click(screen.getByRole('button', { name: /Reactivar/ }))
    fireEvent.change(screen.getByPlaceholderText(/el comercio corrigió/), {
      target: { value: 'El comercio pidió reactivarlo' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Reactivar pack' }))

    // translateDbError tiene mapeado PACK_NOT_RESUMABLE (mensaje del comercio)
    await waitFor(() => expect(screen.getByText(/No se puede reanudar este pack/)).toBeTruthy())
    // El modal sigue abierto (el error se muestra y no se cierra solo)
    expect(screen.getByRole('button', { name: 'Reactivar pack' })).toBeTruthy()
  })

  it('sin packs muestra el estado vacío total', () => {
    hooksState.packs = []
    setup()
    expect(screen.getByText('No hay packs registrados')).toBeTruthy()
  })

  it('con error de la RPC de listado muestra el mensaje traducido', () => {
    hooksState.packs = []
    hooksState.error = 'Esta acción requiere permisos de administrador.'
    setup()
    expect(screen.getByText(/Error al cargar packs/)).toBeTruthy()
  })

  it('mientras carga muestra skeleton y no tarjetas', () => {
    hooksState.packs = []
    hooksState.loading = true
    setup()
    expect(screen.queryByText('Packs')).toBeNull()
    expect(screen.queryByRole('button', { name: /Pausar/ })).toBeNull()
  })
})
