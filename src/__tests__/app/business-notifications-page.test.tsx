import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import BusinessNotificationsPage from '@/app/(business)/business/notifications/page'

// El hook es el contrato de la página: se mockea por completo.
const notifState = vi.hoisted(() => ({
  value: {
    notifications: [] as Array<Record<string, unknown>>,
    unreadCount: 0,
    loading: true,
    error: null as string | null,
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(async () => true),
  },
}))
vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: () => notifState.value,
}))
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-a' }, loading: false }),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(''),
}))

function unreadRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'n-1',
    user_id: 'user-a',
    category: 'reservation',
    type: 'new_reservation',
    title: 'Nueva reserva',
    body: 'Cliente A reservó Pack Panadería Artesanal.',
    data: {},
    reservation_id: 'r-1',
    shop_id: 'shop-a',
    pack_id: 'p-1',
    read_at: null,
    expires_at: null,
    created_at: '2026-08-27T10:00:00Z',
    ...overrides,
  }
}

function readRow(overrides: Record<string, unknown> = {}) {
  return unreadRow({
    id: 'n-2',
    type: 'pickup_completed',
    title: 'Recogida completada',
    body: 'Cliente B recogió su pack.',
    read_at: '2026-08-26T16:00:00Z',
    created_at: '2026-08-26T16:00:00Z',
    ...overrides,
  })
}

describe('BusinessNotificationsPage (página)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    notifState.value.notifications = [unreadRow(), readRow()]
    notifState.value.unreadCount = 1
    notifState.value.loading = false
    notifState.value.error = null
  })

  it('muestra title y body (los campos del esquema real 0006), no el mensaje viejo', () => {
    render(<BusinessNotificationsPage />)
    expect(screen.getByText('Nueva reserva')).toBeTruthy()
    expect(screen.getByText('Cliente A reservó Pack Panadería Artesanal.')).toBeTruthy()
    expect(screen.getByText('Recogida completada')).toBeTruthy()
    expect(screen.getByText('Cliente B recogió su pack.')).toBeTruthy()
  })

  it('muestra el contador de nuevas por read_at', () => {
    render(<BusinessNotificationsPage />)
    expect(screen.getByText('1 nuevas')).toBeTruthy()
  })

  it('el filtro No leídas solo muestra las de read_at NULL', () => {
    render(<BusinessNotificationsPage />)
    fireEvent.click(screen.getByRole('button', { name: /No leidas/ }))
    expect(screen.getByText('Nueva reserva')).toBeTruthy()
    expect(screen.queryByText('Recogida completada')).toBeNull()
  })

  it('no existe botón de borrar: el esquema no tiene camino canónico de borrado', () => {
    render(<BusinessNotificationsPage />)
    // Con 1 no leída los únicos botones de la página son estos tres: si
    // reaparece cualquier otro (p. ej. la papelera), el conteo falla.
    expect(screen.getAllByRole('button')).toHaveLength(3)
    expect(screen.getByRole('button', { name: 'Todas' })).toBeTruthy()
    expect(screen.getByRole('button', { name: /No leidas/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Marcar todas/ })).toBeTruthy()
  })

  it('clic en una no leída la marca como leída; clic en una leída no hace nada', () => {
    render(<BusinessNotificationsPage />)
    fireEvent.click(screen.getByText('Nueva reserva'))
    expect(notifState.value.markAsRead).toHaveBeenCalledTimes(1)
    expect(notifState.value.markAsRead).toHaveBeenCalledWith('n-1')
    fireEvent.click(screen.getByText('Recogida completada'))
    expect(notifState.value.markAsRead).toHaveBeenCalledTimes(1)
  })

  it('con todo leído desaparecen el badge y el botón de marcar todas', () => {
    notifState.value.notifications = [readRow()]
    notifState.value.unreadCount = 0
    render(<BusinessNotificationsPage />)
    expect(screen.queryByText('0 nuevas')).toBeNull()
    expect(screen.queryByRole('button', { name: /Marcar todas/ })).toBeNull()
    // Botones restantes: solo los dos de filtro.
    expect(screen.getAllByRole('button')).toHaveLength(2)
  })

  it('sin notificaciones muestra el estado vacío', () => {
    notifState.value.notifications = []
    notifState.value.unreadCount = 0
    render(<BusinessNotificationsPage />)
    expect(screen.getByText('Sin notificaciones')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Explorar packs' })).toBeTruthy()
  })

  it('Marcar todas avisa con toast cuando el hook lo logra', async () => {
    render(<BusinessNotificationsPage />)
    fireEvent.click(screen.getByRole('button', { name: /Marcar todas/ }))
    expect(await screen.findByText('Todas las notificaciones marcadas como leídas')).toBeTruthy()
  })

  it('Marcar todas avisa con toast de error cuando el hook falla', async () => {
    notifState.value.markAllAsRead = vi.fn(async () => false)
    render(<BusinessNotificationsPage />)
    fireEvent.click(screen.getByRole('button', { name: /Marcar todas/ }))
    expect(await screen.findByText('No se pudieron marcar todas como leídas. Inténtalo de nuevo.')).toBeTruthy()
  })
})
