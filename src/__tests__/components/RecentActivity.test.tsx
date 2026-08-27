import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import RecentActivity from '@/components/dashboard/RecentActivity'

const baseActivity = {
  id: 'r-1',
  type: 'reservation' as const,
  title: 'Pack Panadería Artesanal',
  description: 'Panadería Staging A',
  created_at: '2026-07-15T12:00:00-04:00',
}

describe('RecentActivity', () => {
  it('«Ver todas» enlaza a la ruta canónica /reservations (no al /dashboard/reservations que daba 404)', () => {
    render(<RecentActivity activities={[{ ...baseActivity, status: 'payment_pending', link: '/reservations' }]} />)

    expect(screen.getByRole('link', { name: /Ver todas/ })).toHaveAttribute('href', '/reservations')
  })

  it('el grupo «Reservas Activas» parte expandido y el "ojo" apunta al link de la actividad', () => {
    render(<RecentActivity activities={[{ ...baseActivity, status: 'ready_pickup', link: '/reservations' }]} />)

    // Expandido de fábrica: el contenido de la actividad se ve sin hacer click
    // (el bug de las llaves 'activas'/'completadas' dejaba todos los grupos cerrados).
    expect(screen.getByText('Pack Panadería Artesanal')).toBeTruthy()

    const links = screen.getAllByRole('link')
    const eye = links.find((l) => l.querySelector('svg.lucide-eye'))
    expect(eye, 'debe existir el enlace del ojo').toBeTruthy()
    expect(eye).toHaveAttribute('href', '/reservations')
  })

  it('sin actividad muestra el estado vacío y no ofrece «Ver todas»', () => {
    render(<RecentActivity />)

    expect(screen.getByText('No hay actividad reciente')).toBeTruthy()
    expect(screen.queryByRole('link', { name: /Ver todas/ })).toBeNull()
    expect(screen.getByRole('link', { name: /Explorar packs/ })).toHaveAttribute('href', '/packs')
  })
})
