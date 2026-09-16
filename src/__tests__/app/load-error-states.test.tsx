import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import FavoritesPage from '@/app/(dashboard)/favorites/page'
import NotificationsPage from '@/app/(dashboard)/notifications/page'
import ShopsPage from '@/app/(public)/shops/page'
import { ToastProvider } from '@/components/ui/ToastProvider'

/**
 * A-07: un fallo de carga NO es un estado vacío.
 *
 * Tres pantallas ignoraban el error de su consulta y caían al estado vacío:
 *
 *   favoritos      -> "No tienes favoritos"
 *   notificaciones -> "Sin notificaciones"
 *   comercios      -> "Aún no hay comercios publicados en Paporla"
 *
 * Si la red o la base de datos fallan, la lista llega vacía y la app AFIRMA
 * algo que no sabe. Son dos cosas distintas que se trataban igual:
 *
 *   "no tenemos datos de ti"  -> estado vacío, legítimo
 *   "no conseguí leerlos"     -> error, y hay que decirlo
 *
 * El caso más grave era el directorio público: un visitante nuevo veía "aún no
 * hay comercios publicados" y se iba pensando que Paporla estaba vacía.
 *
 * Estas pruebas fijan el orden: PRIMERO el error, y solo si no hay error se
 * puede afirmar que está vacío.
 */

const fav = vi.hoisted(() => ({ favorites: [] as unknown[], loading: false, error: null as string | null }))
const notif = vi.hoisted(() => ({ notifications: [] as unknown[], loading: false, error: null as string | null }))
const shops = vi.hoisted(() => ({ shops: [] as unknown[], loading: false, error: null as string | null }))

const reloadFav = vi.hoisted(() => vi.fn())
const reloadNotif = vi.hoisted(() => vi.fn())
const reloadShops = vi.hoisted(() => vi.fn())

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u-1' }, loading: false }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/hooks/useFavorites', () => ({
  useFavorites: () => ({
    favorites: fav.favorites,
    favoriteShopIds: [],
    loading: fav.loading,
    error: fav.error,
    removeFavorite: vi.fn(),
    addFavorite: vi.fn(),
    toggleFavorite: vi.fn(),
    isFavorite: () => false,
    reload: reloadFav,
  }),
}))

vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: () => ({
    notifications: notif.notifications,
    unreadCount: 0,
    loading: notif.loading,
    error: notif.error,
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    reload: reloadNotif,
  }),
}))

vi.mock('@/hooks/useShops', () => ({
  useShops: () => ({
    shops: shops.shops,
    loading: shops.loading,
    error: shops.error,
    reload: reloadShops,
  }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  fav.favorites = []
  fav.loading = false
  fav.error = null
  notif.notifications = []
  notif.loading = false
  notif.error = null
  shops.shops = []
  shops.loading = false
  shops.error = null
})

describe('A-07 · Favoritos', () => {
  it('si la carga falla, NO dice "No tienes favoritos"', () => {
    fav.error = 'Error de red'
    render(
      <ToastProvider>
        <FavoritesPage />
      </ToastProvider>,
    )
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.getByText('No pudimos cargar tus favoritos')).toBeTruthy()
    expect(screen.queryByText('No tienes favoritos')).toBeNull()
  })

  it('ofrece reintentar, y el botón llama al hook', () => {
    fav.error = 'Error de red'
    render(
      <ToastProvider>
        <FavoritesPage />
      </ToastProvider>,
    )
    screen.getByRole('button', { name: /reintentar/i }).click()
    expect(reloadFav).toHaveBeenCalled()
  })

  it('sin error y sin favoritos, SÍ puede decir que no tienes ninguno', () => {
    render(
      <ToastProvider>
        <FavoritesPage />
      </ToastProvider>,
    )
    expect(screen.getByText('No tienes favoritos')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

describe('A-07 · Notificaciones', () => {
  it('si la carga falla, NO dice "Sin notificaciones"', () => {
    notif.error = 'No se pudieron cargar las notificaciones.'
    render(<NotificationsPage />)
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.getByText('No pudimos cargar tus notificaciones')).toBeTruthy()
    expect(screen.queryByText('Sin notificaciones')).toBeNull()
  })

  it('ofrece reintentar', () => {
    notif.error = 'Fallo'
    render(<NotificationsPage />)
    screen.getByRole('button', { name: /reintentar/i }).click()
    expect(reloadNotif).toHaveBeenCalled()
  })

  it('sin error y sin notificaciones, SÍ puede decir que no hay ninguna', () => {
    render(<NotificationsPage />)
    expect(screen.getByText('Sin notificaciones')).toBeTruthy()
  })
})

describe('A-07 · Directorio de comercios (el caso más grave)', () => {
  it('si la carga falla, NO dice "Aún no hay comercios publicados"', () => {
    shops.error = 'Error de red'
    render(<ShopsPage />)
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.getByText('No pudimos cargar los comercios')).toBeTruthy()
    expect(screen.queryByText(/Aún no hay comercios publicados/)).toBeNull()
  })

  it('ofrece reintentar', () => {
    shops.error = 'Fallo'
    render(<ShopsPage />)
    screen.getByRole('button', { name: /reintentar/i }).click()
    expect(reloadShops).toHaveBeenCalled()
  })

  it('sin error y sin comercios, SÍ puede decir que aún no hay ninguno', () => {
    render(<ShopsPage />)
    expect(screen.getByText(/Aún no hay comercios publicados/)).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
