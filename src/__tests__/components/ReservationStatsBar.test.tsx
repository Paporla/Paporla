import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ReservationStatsBar from '@/components/business/reservations/ReservationStatsBar'

/**
 * L-43 (Lote Escaparate commit D): el resumen de /business/reservations tenía
 * dos estados sin tarjeta (No retiradas y Expiradas) aunque el hook ya los
 * contaba y los grupos de abajo los listaban: por eso los totales no cuadraban
 * a la vista. Ahora cada estado tiene su tarjeta y una línea explica qué
 * cuenta el bloque.
 */

const stats = {
  total: 12,
  pending: 0,
  confirmed: 0,
  ready: 0,
  completed: 3,
  noShow: 3,
  cancelled: 6,
  expired: 0,
  revenue: 15970,
  todayCount: 0,
}

describe('ReservationStatsBar — todos los estados con tarjeta (L-43)', () => {
  it('los estados que faltaban tienen tarjeta: No retiradas y Expiradas', () => {
    render(<ReservationStatsBar stats={stats} />)

    expect(screen.getByText('No retiradas')).toBeTruthy()
    expect(screen.getByText('Expiradas')).toBeTruthy()
    // Y los de siempre siguen:
    expect(screen.getByText('Canceladas')).toBeTruthy()
    expect(screen.getByText('Total')).toBeTruthy()
  })

  it('las cifras de cada tarjeta son las del hook, no un adorno', () => {
    const { container } = render(<ReservationStatsBar stats={stats} />)

    expect(container.textContent).toContain('12') // total
    expect(container.textContent).toContain('6') // canceladas
    expect(container.textContent).toContain('3') // no retiradas / completadas
  })

  it('una línea explica qué cuenta el bloque, para cuadrar sin adivinar', () => {
    render(<ReservationStatsBar stats={stats} />)

    expect(screen.getByText(/El resumen cuenta TODAS tus reservas por estado/)).toBeTruthy()
  })
})
