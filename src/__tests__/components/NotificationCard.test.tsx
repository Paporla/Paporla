import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import NotificationCard from '@/components/notifications/NotificationCard'
import type { Notification } from '@/hooks/useNotifications'

function row(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'n-1',
    user_id: 'user-a',
    category: 'reservation',
    type: 'new_reservation',
    title: 'Nueva reserva',
    body: 'Cliente A reservó un pack.',
    data: {},
    reservation_id: 'r-1',
    shop_id: null,
    pack_id: null,
    read_at: null,
    expires_at: null,
    created_at: '2026-08-26T12:00:00Z',
    ...overrides,
  }
}

describe('NotificationCard', () => {
  it('muestra title + body (esquema real) y no tiene botón de borrar', () => {
    render(<NotificationCard notification={row()} onMarkAsRead={vi.fn()} />)
    expect(screen.getByText('Nueva reserva')).toBeTruthy()
    expect(screen.getByText('Cliente A reservó un pack.')).toBeTruthy()
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('clic en una no leída (read_at NULL) la marca; en una leída no pasa nada', () => {
    const onMarkAsRead = vi.fn()
    const { rerender } = render(<NotificationCard notification={row()} onMarkAsRead={onMarkAsRead} />)
    fireEvent.click(screen.getByText('Nueva reserva'))
    expect(onMarkAsRead).toHaveBeenCalledTimes(1)
    expect(onMarkAsRead).toHaveBeenCalledWith('n-1')

    rerender(<NotificationCard notification={row({ read_at: '2026-08-26T10:00:00Z' })} onMarkAsRead={onMarkAsRead} />)
    fireEvent.click(screen.getByText('Nueva reserva'))
    expect(onMarkAsRead).toHaveBeenCalledTimes(1)
  })

  it('la no leída lleva el borde de énfasis; la leída, no', () => {
    const { container, rerender } = render(<NotificationCard notification={row()} onMarkAsRead={vi.fn()} />)
    expect(container.firstElementChild?.className).toContain('border-primary')
    rerender(<NotificationCard notification={row({ read_at: '2026-08-26T10:00:00Z' })} onMarkAsRead={vi.fn()} />)
    expect(container.firstElementChild?.className).not.toContain('border-primary')
  })
})
