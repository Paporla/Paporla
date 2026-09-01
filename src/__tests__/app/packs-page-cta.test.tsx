import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

/**
 * CTA de reserva del catálogo (/packs).
 *
 * Hallazgo 4.2 de la auditoría 2026-09-01: el botón estaba desactivado con el
 * mensaje falso «las reservas se activarán cuando integremos pagos», cuando la
 * reserva SÍ funciona en el detalle. Estos tests fijan la corrección: el botón
 * dice «Reservar ahora», registra el clic en el funnel y navega al detalle,
 * donde vive el modal real.
 */

const mockPush = vi.hoisted(() => vi.fn())
const mockTrackClickReserve = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, prefetch: vi.fn() }),
}))

vi.mock('@/lib/analytics/events', () => ({
  trackViewPackList: vi.fn(),
  trackClickReserve: mockTrackClickReserve,
}))

const basePack = {
  id: 'pack-1',
  shop_id: 'shop-1',
  locality_id: 'loc-1',
  title: 'Pack sorpresa panadería',
  description: 'Pan del día',
  category: 'panaderia',
  tags: [],
  allergen_notice: null,
  price_minor: 3990,
  original_price_minor: 9990,
  currency_code: 'CLP',
  remaining_stock: 3,
  pickup_start_at: '2026-09-01T20:00:00Z',
  pickup_end_at: '2026-09-01T22:00:00Z',
  timezone: 'America/Santiago',
  shop_name: 'Panadería Test',
  locality_name: 'Santiago',
  image_url: null,
  distance_meters: null,
}

vi.mock('@/hooks/usePublicPacks', () => ({
  usePublicPacks: () => ({
    packs: [basePack],
    filters: {
      search: '',
      minPrice: 0,
      maxPrice: 100000,
      showAvailableOnly: false,
      city: '',
      location: null,
      radiusKm: 10,
      sortBy: 'newest',
    },
    loading: false,
    error: '',
    setError: vi.fn(),
    setFilters: vi.fn(),
  }),
}))

import PacksPage from '@/app/(public)/packs/PacksPageClient'

beforeEach(() => {
  mockPush.mockReset()
  mockTrackClickReserve.mockReset()
})

describe('CTA de reserva del catálogo', () => {
  it('el botón dice «Reservar ahora», NO «Reservas próximamente»', () => {
    render(<PacksPage />)
    expect(screen.getByRole('button', { name: 'Reservar ahora' })).toBeInTheDocument()
    expect(screen.queryByText('Reservas próximamente')).not.toBeInTheDocument()
  })

  it('al pulsar, registra el clic en el funnel y navega al detalle del pack', () => {
    render(<PacksPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Reservar ahora' }))

    expect(mockTrackClickReserve).toHaveBeenCalledWith('pack-1', 'Pack sorpresa panadería', 3990, 'CLP')
    expect(mockPush).toHaveBeenCalledWith('/packs/pack-1')
  })
})
