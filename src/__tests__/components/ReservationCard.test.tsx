import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ReservationCard from '@/components/business/reservations/ReservationCard'
import type { ReservationItem } from '@/components/business/reservations/useBusinessReservations'

function item(overrides: Partial<ReservationItem> = {}): ReservationItem {
  return {
    reservation_id: 'r-1',
    pack_id: 'p-1',
    pack_title: 'Pack Panadería Artesanal',
    customer_display_name: 'Cliente A',
    status: 'payment_pending',
    payment_status: 'pending',
    total_amount_minor: 3990,
    currency_code: 'CLP',
    // Julio (invierno chileno, UTC-4 en cualquier tzdb): la hora mostrada
    // no depende de cuándo termina el horario de verano.
    pickup_start_at: '2026-07-15T15:00:00-04:00',
    pickup_end_at: '2026-07-15T18:00:00-04:00',
    timezone: 'America/Santiago',
    created_at: '2026-08-26T12:00:00Z',
    ...overrides,
  }
}

describe('ReservationCard (lado business)', () => {
  it('etiqueta payment_pending como "Aguardando confirmación" y ofrece Cancelar', () => {
    render(<ReservationCard reservation={item()} index={0} updating={null} onCancelClick={vi.fn()} />)
    expect(screen.getByText('Aguardando confirmación')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Cancelar/ })).toBeTruthy()
  })

  it('no ofrece Cancelar en estados del historial', () => {
    render(
      <ReservationCard reservation={item({ status: 'cancelled' })} index={0} updating={null} onCancelClick={vi.fn()} />,
    )
    expect(screen.getByText('Cancelada')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Cancelar/ })).toBeNull()
  })

  it('muestra el importe en CLP canónico (sin la vieja división entre 100)', () => {
    render(<ReservationCard reservation={item()} index={0} updating={null} />)
    // El precio y la ventana comparten el <p>, así que se busca por contenido.
    expect(screen.getByText(/3\.990/)).toBeTruthy()
  })

  it('muestra la ventana de recogida con las dos horas', () => {
    render(<ReservationCard reservation={item()} index={0} updating={null} />)
    expect(screen.getByText(/15:00/)).toBeTruthy()
    expect(screen.getByText(/18:00/)).toBeTruthy()
  })

  it('sobrevive a un estado desconocido mostrando su valor crudo, sin acciones', () => {
    render(
      <ReservationCard
        reservation={item({ status: 'estado_raro' })}
        index={0}
        updating={null}
        onCancelClick={vi.fn()}
      />,
    )
    expect(screen.getByText('estado_raro')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Cancelar/ })).toBeNull()
  })

  it('muestra el nombre visible del cliente (y no inventa email ni teléfono)', () => {
    const { container } = render(<ReservationCard reservation={item()} index={0} updating={null} />)
    expect(screen.getByText('Cliente A')).toBeTruthy()
    expect(container.textContent).not.toMatch(/@|\+\d{6,}/)
  })
})
