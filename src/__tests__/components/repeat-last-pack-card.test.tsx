import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import RepeatLastPackCard from '@/components/business/dashboard/RepeatLastPackCard'
import type { DashboardPack } from '@/components/business/dashboard/useBusinessDashboard'

/**
 * Atajo «Repetir mi último pack» (Lote C simplificación UX).
 *
 * La tarjeta solo aparece en el momento útil: hay packs anteriores y ninguno
 * activo (la mañana siguiente, antes de publicar). El enlace apunta a la
 * pantalla de duplicar del pack MÁS RECIENTE (packs[0], orden de
 * list_my_packs: created_at DESC, 0014:465).
 */

function pack(overrides: Partial<DashboardPack> = {}): DashboardPack {
  return {
    id: 'pk-1',
    title: 'Pack Panadería Artesanal',
    status: 'expired',
    price_minor: 3990,
    currency_code: 'CLP',
    total_stock: 5,
    remaining_stock: 0,
    ...overrides,
  }
}

describe('RepeatLastPackCard', () => {
  it('sin packs: no aparece (no hay nada que repetir)', () => {
    const { container } = render(<RepeatLastPackCard packs={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('con un pack activo: no aparece (ya está vendiendo, cero ruido)', () => {
    const { container } = render(<RepeatLastPackCard packs={[pack({ id: 'pk-2', status: 'active' }), pack()]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('con packs anteriores y ninguno activo: ofrece repetir el MÁS reciente', () => {
    render(
      <RepeatLastPackCard
        packs={[
          pack({ id: 'pk-nuevo', title: 'Pack de ayer', status: 'expired' }),
          pack({ id: 'pk-viejo', title: 'Pack antiguo', status: 'expired' }),
        ]}
      />,
    )

    expect(screen.getByText('¿Hoy también tienes excedentes?')).toBeInTheDocument()
    expect(screen.getByText(/«Pack de ayer»/)).toBeInTheDocument()
    // El enlace duplica el más reciente (packs[0]), no el antiguo.
    expect(screen.getByRole('link', { name: /Repetir mi último pack/ })).toHaveAttribute(
      'href',
      '/business/packs/pk-nuevo/duplicate',
    )
  })

  it('también aparece con borradores o agotados (nada activo = nada a la venta)', () => {
    render(<RepeatLastPackCard packs={[pack({ status: 'sold_out' })]} />)
    expect(screen.getByText('¿Hoy también tienes excedentes?')).toBeInTheDocument()
  })
})
