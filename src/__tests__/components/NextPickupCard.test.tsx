import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import NextPickupCard from '@/components/dashboard/NextPickupCard'
import type { MyReservation } from '@/types/reservation'

vi.mock('@/lib/supabase/client', () => ({
  supabaseBrowser: () => ({
    storage: {
      from: () => ({
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://cdn.test/${path}` } }),
      }),
    },
  }),
}))

/**
 * La tarjeta "Próxima recogida" vive en la columna derecha del dashboard,
 * estrecha en escritorio y a pantalla completa en móvil. Los tests guardan
 * dos cosas: (1) que no se invente un código de recogida (no existe hasta la
 * fase 4) y (2) que el layout no se parta en esa medida apretada — el bug
 * real que motivó el rediseño: "6d 3h 54m" apilado en vertical y el chip en
 * dos líneas.
 */
function makeReservation(overrides: Partial<MyReservation> = {}): MyReservation {
  return {
    reservation_id: 'r-0001',
    shop_id: 's-0001',
    pack_id: 'p-0001',
    pack_title: 'Pack Sushi Sorpresa',
    shop_name: 'Panadería Staging A centro',
    shop_address: 'Calle Los Aromos 123, Providencia, Santiago',
    status: 'payment_pending',
    payment_status: 'pending',
    total_amount_minor: 7990,
    currency_code: 'CLP',
    pickup_start_at: '2026-09-30T22:00:00Z',
    pickup_end_at: '2026-10-01T03:00:00Z',
    timezone: 'America/Santiago',
    cancel_reason: null,
    created_at: '2026-09-30T15:00:00Z',
    image_path: null,
    updated_at: '2026-09-30T15:00:00Z',
    shop_latitude: null,
    shop_longitude: null,
    ...overrides,
  }
}

describe('NextPickupCard', () => {
  it('muestra pack, comercio, dirección, ventana en hora de Chile, precio CLP y estado', () => {
    render(<NextPickupCard reservation={makeReservation()} />)
    expect(screen.getByText('Pack Sushi Sorpresa')).toBeDefined()
    expect(screen.getByText('Panadería Staging A centro')).toBeDefined()
    expect(screen.getByText(/Calle Los Aromos 123/)).toBeDefined()
    expect(screen.getByText(/\$7\.990/)).toBeDefined()
    expect(screen.getByText(/30 sept/)).toBeDefined()
    expect(screen.getByText('Aguardando confirmación')).toBeDefined()
  })

  it('nota honesta según estado; el código inventado de la UI legacy no puede volver', () => {
    const { rerender } = render(<NextPickupCard reservation={makeReservation()} />)
    expect(screen.getByText(/El comercio recibirá tu reserva y la confirmará/)).toBeDefined()
    expect(screen.queryByText(/Presenta este código/i)).toBeNull()

    rerender(<NextPickupCard reservation={makeReservation({ status: 'ready_pickup' })} />)
    expect(screen.getByText(/Tu código de recogida aparecerá aquí cuando la reserva quede lista/)).toBeDefined()
  })

  it('la cuenta atrás y el chip nunca se parten: whitespace-nowrap y una sola columna', () => {
    render(<NextPickupCard reservation={makeReservation()} />)

    // La cuenta atrás ("36d Xh Xm" contra la fecha del fixture) debe vivir en
    // un contenedor que impida el wrap: el bug era "6d / 3h / 54m" en vertical.
    const countdown = screen.getByText(/\d+d \d+h \d+m/)
    expect(countdown.closest('.whitespace-nowrap')).not.toBeNull()

    const chip = screen.getByText('Aguardando confirmación')
    expect(chip.className).toContain('whitespace-nowrap')

    // La tarjeta es SIEMPRE una columna (no `md:flex-row` de 3 columnas que
    // aprieta en la medida del dashboard).
    const card = screen.getByText('Pack Sushi Sorpresa').closest('.p-5')
    expect(card).not.toBeNull()
    expect(card!.className).toContain('flex-col')
    expect(card!.className).not.toContain('md:flex-row')
  })

  it('títulos y dirección en una sola línea (clamp/truncate)', () => {
    render(<NextPickupCard reservation={makeReservation()} />)
    expect(screen.getByText('Pack Sushi Sorpresa').className).toContain('line-clamp-1')
    expect(screen.getByText('Panadería Staging A centro').className).toContain('line-clamp-1')
    expect(screen.getByText(/Calle Los Aromos 123/).className).toContain('truncate')
  })

  it('acciones: Cómo llegar a Maps con la dirección y Ver detalles al pack', () => {
    render(<NextPickupCard reservation={makeReservation()} />)
    const maps = screen.getByRole('link', { name: /Cómo llegar/i })
    expect(maps.getAttribute('href')).toContain('google.com/maps')
    expect(maps.getAttribute('href')).toContain(encodeURIComponent('Calle Los Aromos 123, Providencia, Santiago'))
    expect(screen.getByRole('link', { name: 'Ver detalles' })).toHaveAttribute('href', '/packs/p-0001')
  })

  it('muestra la foto del pack cuando hay image_path (0028); sin foto no hay <img>', () => {
    const { rerender } = render(<NextPickupCard reservation={makeReservation({ image_path: 'packs/p-0001.jpg' })} />)
    const img = screen.getByRole('img', { name: 'Pack Sushi Sorpresa' })
    // next/image envuelve el src con su optimizador (/_next/image?url=…); lo
    // importante es que la URL pública de storage (getPublicUrl) esté ahí.
    expect(img.getAttribute('src')).toContain('https%3A%2F%2Fcdn.test%2Fpacks%2Fp-0001.jpg')

    // Sin foto: se queda el icono genérico, no un <img> roto.
    rerender(<NextPickupCard reservation={makeReservation()} />)
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('"Cómo llegar" usa las coordenadas del comercio cuando existen (0028), no el texto de la dirección', () => {
    render(<NextPickupCard reservation={makeReservation({ shop_latitude: -33.42, shop_longitude: -70.63 })} />)
    const maps = screen.getByRole('link', { name: /Cómo llegar/i })
    const href = maps.getAttribute('href') ?? ''
    expect(href).toContain('-33.42,-70.63')
    expect(href).not.toContain(encodeURIComponent('Calle Los Aromos 123, Providencia, Santiago'))
  })

  it('loading muestra skeleton sin datos y error muestra el mensaje', () => {
    const { rerender } = render(<NextPickupCard reservation={makeReservation()} loading />)
    expect(screen.queryByText('Pack Sushi Sorpresa')).toBeNull()

    rerender(<NextPickupCard reservation={makeReservation()} error="No se pudieron cargar tus reservas." />)
    expect(screen.getByText('No se pudieron cargar tus reservas.')).toBeDefined()
    expect(screen.queryByText('Pack Sushi Sorpresa')).toBeNull()
  })
})
