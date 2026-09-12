import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { ToastProvider } from '@/components/ui/ToastProvider'

/**
 * Mis Reservas (usuario) — lote 7 de avisos globales + L-36.
 *
 * Lo importante aquí es L-36: la página tenía un `return` temprano al estado
 * vacío ANTES del final del JSX, que era donde vivía el cartel de error. Cuando
 * fallaba la carga, `reservations` venía vacío, la página pintaba "No tienes
 * reservas activas" y el aviso de error NO SE LLEGABA A PINTAR. El usuario se
 * quedaba sin reservas y sin explicación.
 *
 * También se fija que el aviso de cancelación sale del camarero global y que
 * los fallos al cancelar siguen DENTRO del modal (traducidos y con Reintentar),
 * que es donde se pueden leer, y no volando como aviso de 4 s.
 */

const hookState = vi.hoisted(() => ({
  reservations: [] as Record<string, unknown>[],
  loading: false,
  error: null as string | null,
  cancelling: false,
}))

const cancelReservation = vi.hoisted(() => vi.fn())
const invalidate = vi.hoisted(() => vi.fn())
const routerPush = vi.hoisted(() => vi.fn())

vi.mock('@/hooks/useReservations', () => ({
  useReservations: () => ({
    reservations: hookState.reservations,
    loading: hookState.loading,
    error: hookState.error,
    cancelReservation,
    cancelling: hookState.cancelling,
    invalidate,
  }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPush }),
}))

import UserReservationsPage from '@/app/(dashboard)/reservations/page'

function row(overrides: Record<string, unknown> = {}) {
  return {
    reservation_id: 'r-1',
    shop_id: 'shop-a',
    pack_id: 'pack-1',
    pack_title: 'Pack Panadería Artesanal',
    shop_name: 'Panadería Staging A',
    shop_address: 'Calle 59a',
    status: 'confirmed',
    payment_status: 'paid',
    total_amount_minor: 3990,
    currency_code: 'CLP',
    pickup_start_at: '2026-09-30T19:00:00-03:00',
    pickup_end_at: '2026-09-30T22:00:00-03:00',
    timezone: 'America/Santiago',
    cancel_reason: null,
    created_at: '2026-09-20T12:00:00-03:00',
    image_path: null,
    updated_at: '2026-09-20T12:00:00-03:00',
    ...overrides,
  }
}

function renderPage() {
  return render(
    <ToastProvider>
      <UserReservationsPage />
    </ToastProvider>,
  )
}

/** Abre el modal de cancelación y escribe un motivo válido (mínimo 3 letras). */
async function openCancelModal() {
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar reserva' }))
  const dialog = await screen.findByRole('dialog')
  fireEvent.change(within(dialog).getByLabelText(/¿Por qué la cancelas\?/), {
    target: { value: 'ya no puedo ir a esa hora' },
  })
  return dialog
}

beforeEach(() => {
  hookState.reservations = []
  hookState.loading = false
  hookState.error = null
  hookState.cancelling = false
  cancelReservation.mockReset().mockResolvedValue({ success: true })
  invalidate.mockClear()
  routerPush.mockClear()
})

describe('UserReservationsPage (Mis Reservas)', () => {
  it('L-36 · fallo de carga: caja permanente con Reintentar, y NO el vacío mentiroso', async () => {
    hookState.error = 'No se pudo conectar con el servidor'
    hookState.reservations = []
    renderPage()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No pudimos cargar tus reservas')
    expect(alert).toHaveTextContent('No se pudo conectar con el servidor')

    // Antes salía esto (el return temprano del vacío) y el error no se pintaba.
    expect(screen.queryByText('No tienes reservas activas')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Explorar packs' })).toBeNull()
    // Las cifras tampoco: serían ceros de mentira.
    expect(screen.queryByText('Completadas')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(invalidate).toHaveBeenCalledTimes(1)
  })

  it('sin reservas y con la carga sana: estado vacío honesto y ningún aviso', async () => {
    renderPage()

    expect(await screen.findByText('No tienes reservas activas')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Explorar packs' })).toBeDefined()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('con reservas: se listan, las cifras se ven y no hay ningún aviso', async () => {
    hookState.reservations = [row()]
    renderPage()

    expect(await screen.findByText('Pack Panadería Artesanal')).toBeDefined()
    expect(screen.getByText('Activas')).toBeDefined()
    expect(screen.getByText('Completadas')).toBeDefined()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('lote 7 · cancelar una reserva sirve el aviso desde el camarero global', async () => {
    hookState.reservations = [row()]
    renderPage()
    await screen.findByText('Pack Panadería Artesanal')

    const dialog = await openCancelModal()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar reserva' }))

    await waitFor(() =>
      expect(cancelReservation).toHaveBeenCalledWith({
        reservationId: 'r-1',
        reason: 'ya no puedo ir a esa hora',
      }),
    )

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Reserva cancelada correctamente')
  })

  it('si cancelar falla, el error se queda DENTRO del modal (no vuela como aviso)', async () => {
    cancelReservation.mockReset().mockRejectedValue(new Error('El plazo para cancelar ya pasó'))
    hookState.reservations = [row()]
    renderPage()
    await screen.findByText('Pack Panadería Artesanal')

    const dialog = await openCancelModal()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar reserva' }))

    // El mensaje se lee dentro del diálogo, con su Reintentar en el pie.
    await waitFor(() => expect(within(dialog).getByText('El plazo para cancelar ya pasó')).toBeDefined())
    expect(within(dialog).getByRole('button', { name: 'Reintentar' })).toBeDefined()
    // Y no se sirve ningún aviso global duplicado: el único alert es el del modal.
    expect(screen.getAllByRole('alert')).toHaveLength(1)
  })

  it('cargando: no se afirma prematuramente que no haya reservas', () => {
    hookState.loading = true
    const { container } = renderPage()

    // PageLoadingSpinner pinta un esqueleto y descarta el `message` que se le
    // pasa (comportamiento existente, no parte de este cambio). Lo que importa
    // aquí es que mientras carga no se afirma nada: ni vacío, ni error.
    expect(container.querySelector('.animate-pulse')).not.toBeNull()
    expect(screen.queryByText('No tienes reservas activas')).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
