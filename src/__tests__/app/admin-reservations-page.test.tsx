import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

/**
 * Página /admin/reservations (ADMIN-1): soporte de reservas. El hook de
 * listado es el contrato de datos y se mockea por completo (sus pruebas
 * RPC viven en src/__tests__/hooks/useAdminReservations.test.tsx). Aquí se
 * protege el comportamiento NUEVO:
 *  1. La tabla muestra las filas y cada una abre la ficha (Detalle).
 *  2. La búsqueda filtra por comprador/email/pack/comercio ("X de Y").
 *  3. Los chips de estado filtran con conteo.
 *  4. Sin resultados hay estado honesto con "Limpiar filtros".
 *  5. La ficha muestra los DOS estados (reserva y pago) y la nota del código
 *     hasheado (no se puede buscar por código de retiro, por diseño).
 *  6. Estados de carga, error y vacío total.
 */

const hooksState = vi.hoisted(() => ({
  reservations: [] as unknown[],
  loading: false,
  error: '',
}))

const useAdminReservationsMock = vi.hoisted(() => vi.fn())

vi.mock('@/components/admin/useAdminReservations', () => ({
  useAdminReservations: useAdminReservationsMock,
}))

import AdminReservationsPage from '@/app/(admin)/admin/reservations/page'
import { AdminReservationRow } from '@/components/admin/useAdminReservations'

function fila(overrides: Partial<AdminReservationRow>): AdminReservationRow {
  return {
    reservation_id: 'res-aaaa-1',
    user_id: 'user-a',
    user_name: 'María Gonzalez',
    user_email: 'maria@paporla.test',
    shop_id: 'shop-1',
    shop_name: 'Panadería La Esperanza',
    shop_address: 'Av. Providencia 1234',
    pack_title: 'Pack Sorpresa de Panadería',
    total_amount_minor: '4500',
    currency_code: 'CLP',
    status: 'ready_pickup',
    payment_status: 'paid',
    pickup_start_at: '2026-09-30T23:00:00Z',
    pickup_end_at: '2026-10-01T00:30:00Z',
    timezone_snapshot: 'America/Santiago',
    created_at: '2026-09-25T10:00:00Z',
    updated_at: '2026-09-25T12:00:00Z',
    ...overrides,
  }
}

const filaLista = fila({})
const filaCancelada = fila({
  reservation_id: 'res-bbbb-2',
  user_name: 'Carlos Soto',
  user_email: 'carlos@paporla.test',
  pack_title: 'Pack Café & Croissant',
  shop_name: 'Café Verde',
  status: 'cancelled',
  payment_status: 'refunded',
})

function setup() {
  return render(<AdminReservationsPage />)
}

describe('AdminReservationsPage (ADMIN-1)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // mockImplementation (no mockReturnValue): lee el estado EN VIVO, así los
    // tests pueden reasignar hooksState dentro del cuerpo del test.
    useAdminReservationsMock.mockImplementation(() => ({
      reservations: hooksState.reservations,
      loading: hooksState.loading,
      error: hooksState.error,
    }))
  })

  it('muestra las reservas y abre la ficha con el botón Detalle', () => {
    hooksState.reservations = [filaLista, filaCancelada]
    setup()

    expect(screen.getByText('María Gonzalez')).toBeTruthy()
    expect(screen.getByText('Carlos Soto')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: /Detalle/ })).toHaveLength(2)

    fireEvent.click(screen.getAllByRole('button', { name: /Detalle/ })[0])

    expect(screen.getByText('Detalle de reserva')).toBeTruthy()
    // El email aparece dos veces (tabla + ficha)
    expect(screen.getAllByText('maria@paporla.test').length).toBeGreaterThanOrEqual(1)
    // Los DOS estados de la transacción, no solo el de reserva
    expect(screen.getByText('Reserva: Lista para recoger')).toBeTruthy()
    expect(screen.getByText('Pago: Pagado')).toBeTruthy()
    // Nota honesta: el código de retiro no se muestra ni se busca
    expect(screen.getByText(/cifrado \(hash\) en la base por diseño/)).toBeTruthy()
  })

  it('la fila completa también abre la ficha', () => {
    hooksState.reservations = [filaLista]
    setup()

    fireEvent.click(screen.getByText('Pack Sorpresa de Panadería'))
    expect(screen.getByText('Detalle de reserva')).toBeTruthy()
  })

  it('la búsqueda por comercio reduce a "X de Y reservas"', () => {
    hooksState.reservations = [filaLista, filaCancelada]
    setup()

    fireEvent.change(screen.getByPlaceholderText(/Buscar por comprador/), {
      target: { value: 'café' },
    })

    expect(screen.getByText('1 de 2 reservas')).toBeTruthy()
    expect(screen.queryByText('María Gonzalez')).toBeNull()
    expect(screen.getByText('Carlos Soto')).toBeTruthy()
  })

  it('la búsqueda por email del comprador también encuentra', () => {
    hooksState.reservations = [filaLista, filaCancelada]
    setup()

    fireEvent.change(screen.getByPlaceholderText(/Buscar por comprador/), {
      target: { value: 'maria@' },
    })

    expect(screen.getByText('1 de 2 reservas')).toBeTruthy()
    expect(screen.getByText('María Gonzalez')).toBeTruthy()
  })

  it('sin resultados muestra estado honesto y "Limpiar filtros" restaura', () => {
    hooksState.reservations = [filaLista]
    setup()

    fireEvent.change(screen.getByPlaceholderText(/Buscar por comprador/), {
      target: { value: 'zzz-sin-coincidencias' },
    })
    expect(screen.getByText('Ninguna reserva coincide con la búsqueda')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    expect(screen.getByText('María Gonzalez')).toBeTruthy()
    expect(screen.getByText('1 reserva en total — todas las transacciones')).toBeTruthy()
  })

  it('los chips de estado filtran y cuentan', () => {
    hooksState.reservations = [filaLista, filaCancelada]
    setup()

    expect(screen.getByText('Todas (2)')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Cancelada (1)' }))

    expect(screen.getByText('1 de 2 reservas')).toBeTruthy()
    expect(screen.queryByText('María Gonzalez')).toBeNull()
    expect(screen.getByText('Carlos Soto')).toBeTruthy()
  })

  it('sin reservas muestra el estado vacío total', () => {
    hooksState.reservations = []
    setup()

    expect(screen.getByText('No hay reservas registradas')).toBeTruthy()
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('con error de la RPC muestra el mensaje traducido', () => {
    hooksState.reservations = []
    hooksState.error = 'Esta acción requiere permisos de administrador.'
    setup()

    expect(screen.getByText(/Error al cargar reservas/)).toBeTruthy()
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('mientras carga muestra skeleton y no tabla', () => {
    hooksState.reservations = []
    hooksState.loading = true
    setup()

    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.queryByText('Reservas')).toBeNull()
  })
})
