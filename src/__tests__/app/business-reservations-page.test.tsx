import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ToastProvider } from '@/components/ui/ToastProvider'
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
  error: '',
  loadError: '',
  success: '',
  cancelReservation: null as ((...args: unknown[]) => Promise<void>) | null,
  confirmReservation: null as ((...args: unknown[]) => Promise<void>) | null,
  confirmResult: null as { code: string | null; packTitle: string; note: string | null } | null,
}))

// Espías estables para comprobar que la página limpia el estado del hook al
// servir el aviso (patrón puente) y que Reintentar llama a `reload`.
const setError = vi.hoisted(() => vi.fn())
const setSuccess = vi.hoisted(() => vi.fn())
const reload = vi.hoisted(() => vi.fn())

vi.mock('@/components/business/reservations/useBusinessReservations', () => ({
  useBusinessReservations: () => ({
    shopId: 'shop-a',
    loading: false,
    error: hookState.error,
    loadError: hookState.loadError,
    success: hookState.success,
    setError,
    setSuccess,
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
    reload,
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

// Lote 6: los avisos los sirve el ToastProvider global, así que los tests
// envuelven la página igual que providers.tsx.
function page() {
  return (
    <ToastProvider>
      <BusinessReservationsPage />
    </ToastProvider>
  )
}

function renderPage() {
  return render(page())
}

describe('business/reservations page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    hookState.reservations = []
    hookState.stats = { ...baseStats }
    hookState.error = ''
    hookState.loadError = ''
    hookState.success = ''
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
    renderPage()
    expect(screen.getByRole('heading', { name: 'Pendientes de confirmar' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Confirmadas' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Historial' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Recogidas' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Canceladas' })).toBeTruthy()
  })

  it('el grupo de pendientes explica qué hace confirmar (regla F2b)', () => {
    hookState.reservations = [row()]
    renderPage()
    expect(screen.getByText(/Al confirmar, la reserva pasa a lista para recoger/)).toBeTruthy()
  })

  it('muestra Recogidas de hoy y el validador (el placeholder ya no existe)', () => {
    hookState.reservations = [row()]
    renderPage()
    expect(screen.getByTestId('today-pickups')).toBeTruthy()
    expect(screen.getByTestId('pickup-validator')).toBeTruthy()
    expect(screen.queryByText(/vuelven activos en el próximo paso/)).toBeNull()
  })

  it('cancela una reserva pasando por el modal de confirmación', async () => {
    hookState.reservations = [row()]
    renderPage()

    fireEvent.click(screen.getByRole('heading', { name: 'Pendientes de confirmar' }))
    const cancelButton = await screen.findByRole('button', { name: /Cancelar/ })
    fireEvent.click(cancelButton)

    expect(await screen.findByText(/¿Estás seguro de que quieres cancelar esta reserva\?/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Sí, cancelar' }))

    await waitFor(() => expect(hookState.cancelReservation).toHaveBeenCalledWith('r-1'))
  })

  it('confirma una reserva por el modal y muestra el código (una sola vez)', async () => {
    hookState.reservations = [row()]
    const { rerender } = renderPage()

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
    rerender(page())
    expect(screen.queryByText('P4P-ABCD1234')).toBeNull()
  })

  it('no pinta el estado legacy "Pendiente" ni datos de contacto del cliente', async () => {
    hookState.reservations = [row()]
    renderPage()

    fireEvent.click(screen.getByRole('heading', { name: 'Pendientes de confirmar' }))
    expect(await screen.findByText('Aguardando confirmación')).toBeTruthy()
    expect(screen.getByText('Cliente A')).toBeTruthy()
    expect(screen.queryByText('Pendiente')).toBeNull()
    expect(screen.queryByText(/@/)).toBeNull()
  })

  it('el historial no ofrece acciones', async () => {
    hookState.reservations = [row({ reservation_id: 'r-9', status: 'cancelled' })]
    renderPage()

    fireEvent.click(screen.getByRole('heading', { name: 'Canceladas' }))
    await waitFor(() => expect(screen.getByText('Cliente A')).toBeTruthy())
    expect(screen.queryByRole('button', { name: /Cancelar/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /^Confirmar$/ })).toBeNull()
  })

  it('muestra los ingresos formateados como CLP canónico', () => {
    hookState.reservations = [row()]
    hookState.stats = { ...baseStats, revenue: 12990 }
    renderPage()
    expect(screen.getByText('$12.990')).toBeTruthy()
  })

  it('muestra el estado vacío y oculta el export', () => {
    hookState.reservations = []
    renderPage()
    expect(screen.getByText('No hay reservas')).toBeTruthy()
    expect(screen.queryByText('Exportar CSV')).toBeNull()
  })

  it('L-24: agrupa por estado EFECTIVO — ready_pickup con ventana aún cerrada cae en "Confirmadas"', () => {
    hookState.reservations = [
      row({
        reservation_id: 'r-far',
        status: 'ready_pickup',
        pickup_start_at: '2099-01-01T00:00:00-03:00',
        pickup_end_at: '2099-01-02T00:00:00-03:00',
      }),
    ]
    renderPage()
    expect(screen.getByRole('heading', { name: 'Confirmadas' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Listas para recoger' })).toBeNull()
  })

  it('lote 6 · éxito de una acción: aviso global y el estado del hook se limpia', () => {
    hookState.reservations = [row()]
    hookState.success = 'Reserva cancelada y stock reintegrado'
    renderPage()

    expect(screen.getByRole('alert')).toHaveTextContent('Reserva cancelada y stock reintegrado')
    expect(setSuccess).toHaveBeenCalledWith('')
  })

  it('lote 6 · error de una acción: aviso global de error y el estado del hook se limpia', () => {
    hookState.reservations = [row()]
    hookState.error = 'No tienes permiso para gestionar esta reserva.'
    renderPage()

    expect(screen.getByRole('alert')).toHaveTextContent('No tienes permiso para gestionar esta reserva.')
    expect(setError).toHaveBeenCalledWith('')
  })

  it('L-35 · fallo de carga: caja permanente con Reintentar, sin "No hay reservas" ni cifras', () => {
    hookState.reservations = []
    hookState.loadError = 'Esta cuenta no gestiona ese comercio.'
    renderPage()

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('No pudimos cargar tus reservas')
    expect(alert).toHaveTextContent('Esta cuenta no gestiona ese comercio.')

    // Mientras dura el fallo no se afirma que no haya reservas ni se enseñan
    // cifras que serían ceros de mentira.
    expect(screen.queryByText('No hay reservas')).toBeNull()
    expect(screen.queryByText('Ingresos')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('sin fallos no hay ningún aviso en la página', () => {
    hookState.reservations = [row()]
    renderPage()

    expect(screen.getByText('Ingresos')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull()
  })

  it('L-24: con la ventana abierta, la misma reserva cae en "Listas para recoger"', () => {
    hookState.reservations = [
      row({
        reservation_id: 'r-open',
        status: 'ready_pickup',
        // Ventana SIEMPRE abierta: la etiqueta y el grupo miran el reloj.
        pickup_start_at: '2020-01-01T00:00:00-03:00',
        pickup_end_at: '2099-01-01T00:00:00-03:00',
      }),
    ]
    renderPage()
    expect(screen.getByRole('heading', { name: 'Listas para recoger' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Confirmadas' })).toBeNull()
  })
})
