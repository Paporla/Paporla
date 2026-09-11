import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import NotificationsPage from '@/app/(dashboard)/notifications/page'
import { ToastProvider } from '@/components/ui/ToastProvider'

/**
 * Lote UX punto 4: la página de notificaciones del usuario ya no fabrica su
 * <Toast> local (estado + temporizador de 2 s propios); el aviso de "Marcar
 * todas" viaja al ToastProvider global (role="alert", auto-dismiss 4 s).
 * Es la gemela del usuario de business-notifications-page.test.tsx.
 */
const notifState = vi.hoisted(() => ({
  value: {
    notifications: [] as Array<Record<string, unknown>>,
    unreadCount: 0,
    loading: false,
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
    type: 'confirmation',
    title: 'Reserva confirmada',
    body: 'El comercio confirmó tu reserva.',
    data: {},
    reservation_id: 'r-1',
    shop_id: 'shop-a',
    pack_id: 'p-1',
    read_at: null,
    expires_at: null,
    created_at: '2026-09-10T10:00:00Z',
    ...overrides,
  }
}

function renderPage() {
  return render(
    <ToastProvider>
      <NotificationsPage />
    </ToastProvider>,
  )
}

describe('NotificationsPage (usuario · toasts globales)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    notifState.value.notifications = [unreadRow()]
    notifState.value.unreadCount = 1
    notifState.value.loading = false
    notifState.value.markAllAsRead = vi.fn(async () => true)
  })

  it('Marcar todas avisa con toast GLOBAL (role=alert) cuando el hook lo logra', async () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: /Marcar todas/ }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Todas marcadas como leídas')
  })

  it('Marcar todas avisa con toast GLOBAL de error cuando el hook falla', async () => {
    notifState.value.markAllAsRead = vi.fn(async () => false)
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: /Marcar todas/ }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No se pudieron marcar todas como leídas. Inténtalo de nuevo.')
  })

  it('mientras carga no hay botón de marcar todas ni toast: solo esqueleto', () => {
    notifState.value.loading = true
    renderPage()

    expect(screen.queryByRole('button', { name: /Marcar todas/ })).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
