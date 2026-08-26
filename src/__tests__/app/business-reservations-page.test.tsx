import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import BusinessReservationsPage from '@/app/(business)/business/reservations/page'

/**
 * Página del panel de reservas (tests de presentación): el hook de datos se
 * mockea completo; lo que se comprueba es cómo se agrupa, qué se muestra y
 * qué acciones se ofrecen. TodayPickups y el validador de códigos se stubean
 * (su lógica de datos se prueba en sus propios archivos).
 */
const hookState = vi.hoisted(() => ({
  reservations: [] as Record<string, unknown>[],
  stats: null as Record<string, number> | null,
  cancelReservation: null as ((...args: unknown[]) => Promise<void>) | null,
  confirmReservation: null as ((...args: unknown[]) => Promise<void>) | null,
  confirmResult: null as { code: string | null; packTitle: string; note: string | null } | null,
}))

vi.mock('@/components/business/reservations/useBusinessReservations', () => ({
  useBusinessReservations: () => ({
    shopId: 'shop-a',
    loading: false,
    error: '',
    success: '',
    setError: vi.fn(),
    setSuccess: vi.fn(),
    searchTerm: '',
    setSearchTerm: vi.fn(),
    statusFilter: 'all',
    setStatusFilter: vi.fn(),
    reservations: hookState.reservations,
    stats: hookState.stats,
    updating: null,
    cancelReservation: (...args: unknown[]) => hookState.cancelReservation!(...args),
    confirmReservation: (...args: unknown[]) => hookState.confirmReservation!(...args),
    confirmResult: hookState.confirmResult,
    setConfirmResult: (value: { code: string | null; packTitle: string; note: string | null } | null) => {
      hookState.confirmResult = value
    },
    reload: vi.fn(),
  }),
}))

vi.mock('@/components/business/TodayPickups', () => ({
  default: () => <div data-testid="today-pickups">Recogidas de hoy (stub)</div>,
}))

vi.mock('@/components/business/PickupCodeValidator', () => ({
  default: () => <div data-testid="pickup-validator">Validar código de recogida (stub)</div>,
}))

function row(overrides: Record<string, unknown> = {}) {
  return {
    reservation_id: 'r-1',
    pack_id: 'p-1',
    pack_title: 'Pack Panadería Artesanal',
    customer_display_name: 'Cliente A',
    status: 'payment_pending',
    payment_status: 'pending',
    total_amount_minor: 3990,
    currency_code: 'CLP',
    pickup_start_at: '2026-09-30T15:00:00-04:00',
    pickup_end_at: '2026-09-30T18:00:00-04:00',
    timezone: 'America/Santiago',
    created_at: '2026-08-26T12:00:00Z',
    ...overrides,
  }
}

const baseStats = {
  total: 3,
  pending: 1,
  confirmed: 1,
  ready: 0,
  completed: 0,
  noShow: 0,
  cancelled: 1,
  expired: 0,
  revenue: 0,
  todayCount: 1,
}

describe('business/reservations page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    hookState.reservations = []
    hookState.stats = { ...baseStats }
    hookState.confirmResult = null
    hookState.cancelReservation = vi.fn().mockResolvedValue(undefined)
    hookState.confirmReservation = vi.fn().mockResolvedValue(undefined)
  })

  it('agrupa por estados canónicos y separa el historial', () => {
    hookState.reservations = [
      row(),
      row({ reservation_id: 'r-2', status: 'confirmed' }),
      row({ reservation_id: 'r-3', status: 'picked_up' }),
      row({ reservation_id: 'r-4', status: 'cancelled' }),
    ]
    render(<BusinessReservationsPage />)
    expect(screen.getByRole('heading', { name: 'Pendientes de confirmar' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Confirmadas' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Historial' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Recogidas' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Canceladas' })).toBeTruthy()
  })

  it('el grupo de pendientes explica qué hace confirmar (regla F2b)', () => {
    hookState.reservations = [row()]
    render(<BusinessReservationsPage />)
    expect(screen.getByText(/Al confirmar, la reserva pasa a lista para recoger/)).toBeTruthy()
  })

  it('muestra Recogidas de hoy y el validador (el placeholder ya no existe)', () => {
    hookState.reservations = [row()]
    render(<BusinessReservationsPage />)
    expect(screen.getByTestId('today-pickups')).toBeTruthy()
    expect(screen.getByTestId('pickup-validator')).toBeTruthy()
    expect(screen.queryByText(/vuelven activos en el próximo paso/)).toBeNull()
  })

  it('cancela una reserva pasando por el modal de confirmación', async () => {
    hookState.reservations = [row()]
    render(<BusinessReservationsPage />)

    fireEvent.click(screen.getByRole('heading', { name: 'Pendientes de confirmar' }))
    const cancelButton = await screen.findByRole('button', { name: /Cancelar/ })
    fireEvent.click(cancelButton)

    expect(await screen.findByText(/¿Estás seguro de que quieres cancelar esta reserva\?/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Sí, cancelar' }))

    await waitFor(() => expect(hookState.cancelReservation).toHaveBeenCalledWith('r-1'))
  })

  it('confirma una reserva por el modal y muestra el código (una sola vez)', async () => {
    hookState.reservations = [row()]
    const { rerender } = render(<BusinessReservationsPage />)

    fireEvent.click(screen.getByRole('heading', { name: 'Pendientes de confirmar' }))
    fireEvent.click(await screen.findByRole('button', { name: /^Confirmar$/ }))

    expect(await screen.findByText(/¿Confirmar esta reserva\?/)).toBeTruthy()

    // El "hook" simulado emite el código al confirmar (como hace el real, 0031).
    hookState.confirmReservation = vi.fn(async () => {
      hookState.confirmResult = { code: 'P4P-ABCD1234', packTitle: 'Pack Panadería Artesanal', note: null }
      return undefined
    })
    fireEvent.click(screen.getByRole('button', { name: 'Sí, confirmar' }))

    await waitFor(() => expect(hookState.confirmReservation).toHaveBeenCalledTimes(1))
    expect(await screen.findByText('P4P-ABCD1234')).toBeTruthy()
    expect(screen.getByText(/Este código se muestra una sola vez/)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Entendido' }))
    rerender(<BusinessReservationsPage />)
    expect(screen.queryByText('P4P-ABCD1234')).toBeNull()
  })

  it('no pinta el estado legacy "Pendiente" ni datos de contacto del cliente', async () => {
    hookState.reservations = [row()]
    render(<BusinessReservationsPage />)

    fireEvent.click(screen.getByRole('heading', { name: 'Pendientes de confirmar' }))
    expect(await screen.findByText('Aguardando confirmación')).toBeTruthy()
    expect(screen.getByText('Cliente A')).toBeTruthy()
    expect(screen.queryByText('Pendiente')).toBeNull()
    expect(screen.queryByText(/@/)).toBeNull()
  })

  it('el historial no ofrece acciones', async () => {
    hookState.reservations = [row({ reservation_id: 'r-9', status: 'cancelled' })]
    render(<BusinessReservationsPage />)

    fireEvent.click(screen.getByRole('heading', { name: 'Canceladas' }))
    await waitFor(() => expect(screen.getByText('Cliente A')).toBeTruthy())
    expect(screen.queryByRole('button', { name: /Cancelar/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /^Confirmar$/ })).toBeNull()
  })

  it('muestra los ingresos formateados como CLP canónico', () => {
    hookState.reservations = [row()]
    hookState.stats = { ...baseStats, revenue: 12990 }
    render(<BusinessReservationsPage />)
    expect(screen.getByText('$12.990')).toBeTruthy()
  })

  it('muestra el estado vacío y oculta el export', () => {
    hookState.reservations = []
    render(<BusinessReservationsPage />)
    expect(screen.getByText('No hay reservas')).toBeTruthy()
    expect(screen.queryByText('Exportar CSV')).toBeNull()
  })
})
