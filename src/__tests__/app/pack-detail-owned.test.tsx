import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import PackDetailClient from '@/app/(public)/packs/[id]/PackDetailClient'
import type { SerializedPack } from '@/app/(public)/packs/[id]/PackDetailClient'

/**
 * L-10: con reserva ACTIVA del propio pack, la ficha muestra "Ya tienes
 * este pack" con su estado y el camino a Mis reservas — no una segunda
 * compra imposible. Con reserva cancelada (o sin reserva), el CTA vuelve.
 */

const owned = vi.hoisted(() => ({
  reservations: [] as Array<Record<string, unknown>>,
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u-1', email: 'user@a.test' }, loading: false, signIn: vi.fn() }),
}))

vi.mock('@/hooks/useReservations', () => ({
  useReservations: () => ({
    reservations: owned.reservations,
    loading: false,
    error: null,
    cancelReservation: vi.fn(),
  }),
}))

vi.mock('@/app/(public)/packs/[id]/components/ReserveModal', () => ({
  default: () => null,
}))

const pack: SerializedPack = {
  id: 'p-1',
  title: 'Pack Sorpresa Panadería',
  description: null,
  allergen_notice: null,
  category: 'panadería',
  price_minor: 3990,
  original_price_minor: 5990,
  currency_code: 'CLP',
  remaining_stock: 4,
  pickup_start_at: '2099-07-15T15:00:00-04:00',
  pickup_end_at: '2099-07-15T18:00:00-04:00',
  timezone: 'America/Santiago',
  image_url: null,
  shop_id: 's-1',
  shop: {
    id: 's-1',
    name: 'Panadería Staging A centro',
    description: null,
    address: null,
    city: 'Santiago',
    phone: null,
    logo_url: null,
    rating: null,
    verified: true,
  },
}

function reservation(status: string) {
  return {
    reservation_id: 'r-1',
    pack_id: 'p-1',
    status,
    payment_status: 'paid',
    pickup_start_at: '2099-07-15T15:00:00-04:00',
    pickup_end_at: '2099-07-15T18:00:00-04:00',
  }
}

describe('PackDetailClient — estado propio del usuario (L-10)', () => {
  beforeEach(() => {
    owned.reservations = []
  })

  it('con reserva confirmada del pack: banner honesto y SIN botón Reservar', () => {
    owned.reservations = [reservation('confirmed')]
    render(<PackDetailClient initialPack={pack} />)
    expect(screen.getByText('Ya tienes este pack')).toBeTruthy()
    expect(screen.getByText(/Ver en Mis reservas/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Reservar' })).toBeNull()
  })

  it('el banner dice el estado EFECTIVO: confirmada con ventana cerrada no miente "lista"', () => {
    owned.reservations = [reservation('ready_pickup')]
    render(<PackDetailClient initialPack={pack} />)
    expect(screen.getByText(/Estado:/)).toBeTruthy()
    expect(screen.getByText(/Confirmada/)).toBeTruthy()
  })

  it('sin reservas: el CTA Reservar sigue ahí', () => {
    render(<PackDetailClient initialPack={pack} />)
    expect(screen.getByRole('button', { name: 'Reservar' })).toBeTruthy()
    expect(screen.queryByText('Ya tienes este pack')).toBeNull()
  })

  it('reserva cancelada NO cuenta como propia: se puede volver a reservar', () => {
    owned.reservations = [reservation('cancelled')]
    render(<PackDetailClient initialPack={pack} />)
    expect(screen.getByRole('button', { name: 'Reservar' })).toBeTruthy()
  })

  it('reserva de OTRO pack no bloquea este', () => {
    owned.reservations = [{ ...reservation('confirmed'), pack_id: 'p-OTRO' }]
    render(<PackDetailClient initialPack={pack} />)
    expect(screen.getByRole('button', { name: 'Reservar' })).toBeTruthy()
  })
})
