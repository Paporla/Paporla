import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import PackCardPublic from '@/components/packs/PackCardPublic'

/**
 * Tarjeta del catálogo público: la ventana de recogida se muestra COMPLETA
 * (inicio y fin), no solo la hora de inicio. La hora de fin es la mitad de
 * la decisión del usuario ("¿me da tiempo a pasar después del trabajo?").
 */

function pack(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pk-1',
    locality_id: 'loc-1',
    title: 'Pack Panadería Artesanal',
    description: 'Pan del día',
    price_minor: 3990,
    original_price_minor: 7990,
    currency_code: 'CLP',
    remaining_stock: 3,
    total_stock: 5,
    image_url: null,
    category: 'panaderia',
    tags: [],
    allergen_notice: null,
    // 18:00–20:00 hora de Chile (America/Santiago, UTC-3 en esa fecha).
    pickup_start_at: '2026-09-30T21:00:00Z',
    pickup_end_at: '2026-09-30T23:00:00Z',
    timezone: 'America/Santiago',
    shop_id: 'shop-1',
    shop_name: 'Panadería Staging A',
    shop_category: 'panaderia',
    shop_address: 'Av. Providencia 123',
    locality_name: 'Providencia',
    shop_latitude: null,
    shop_longitude: null,
    shop_rating: null,
    shop_rating_count: 0,
    distance_meters: null,
    ...overrides,
  }
}

describe('PackCardPublic', () => {
  it('muestra la ventana de recogida completa: inicio Y fin', () => {
    render(<PackCardPublic pack={pack()} onReserve={vi.fn()} index={0} reserving={null} reservationsEnabled />)

    // "mié, 18:00–20:00": día + inicio + fin, en la tz del mercado.
    expect(screen.getByText(/18:00–20:00/)).toBeInTheDocument()
  })

  it('con fecha de fin inválida no rompe: muestra al menos el inicio', () => {
    render(
      <PackCardPublic
        pack={pack({ pickup_end_at: 'no-es-fecha' })}
        onReserve={vi.fn()}
        index={0}
        reserving={null}
        reservationsEnabled
      />,
    )

    expect(screen.getByText(/18:00/)).toBeInTheDocument()
  })

  it('con fecha de inicio inválida cae al texto neutro', () => {
    render(
      <PackCardPublic
        pack={pack({ pickup_start_at: 'no-es-fecha' })}
        onReserve={vi.fn()}
        index={0}
        reserving={null}
        reservationsEnabled
      />,
    )

    expect(screen.getByText('Horario por confirmar')).toBeInTheDocument()
  })
})
