import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import FavoriteButton from '@/components/favorites/FavoriteButton'
import { ToastProvider } from '@/components/ui/ToastProvider'

/**
 * Lote UX punto 4: FavoriteButton ya no fabrica su <Toast> local con estado y
 * temporizador propios; el aviso viaja al ToastProvider global (role="alert").
 * Dos comportamientos que el cambio mejora y estos tests fijan:
 *  - sin sesión el aviso es 'info' (antes salía pintado de 'success');
 *  - como el provider vive en la raíz, el aviso sobrevive al salto a /login.
 *
 * L-29: ese salto al login lleva la dirección de vuelta (`?redirect=`), que
 * `useAuth.signIn` valida con `getSafeInternalRedirect` antes de usarla.
 */
const authState = vi.hoisted(() => ({
  user: { id: 'user-a' } as { id: string } | null,
}))

const push = vi.hoisted(() => vi.fn())

const favState = vi.hoisted(() => ({
  favorites: [] as string[],
  toggleFavorite: vi.fn(async () => true),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: authState.user, loading: false }),
}))

vi.mock('@/hooks/useFavorites', () => ({
  useFavorites: () => ({
    favorites: favState.favorites,
    isLoading: false,
    isFavorite: (shopId: string) => favState.favorites.includes(shopId),
    toggleFavorite: favState.toggleFavorite,
  }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}))

function renderButton(shopId = 'shop-a') {
  return render(
    <ToastProvider>
      <FavoriteButton shopId={shopId} />
    </ToastProvider>,
  )
}

describe('FavoriteButton (toasts globales)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.user = { id: 'user-a' }
    favState.favorites = []
    favState.toggleFavorite = vi.fn(async () => true)
    // Algunos tests mueven la URL de jsdom para comprobar la vuelta al login.
    window.history.replaceState({}, '', '/')
  })

  it('sin sesión: aviso GLOBAL (role=alert) y no llama a toggleFavorite', async () => {
    authState.user = null
    renderButton()

    fireEvent.click(screen.getByRole('button'))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Inicia sesión para guardar favoritos')
    expect(favState.toggleFavorite).not.toHaveBeenCalled()
  })

  it('L-29 · sin sesión te manda al login con la dirección de vuelta', async () => {
    authState.user = null
    window.history.replaceState({}, '', '/shops/shop-a')
    renderButton()

    fireEvent.click(screen.getByRole('button'))

    expect(await screen.findByRole('alert')).toHaveTextContent('Inicia sesión para guardar favoritos')
    // El salto va con 1,5 s de retardo para que dé tiempo a leer el aviso.
    await waitFor(() => expect(push).toHaveBeenCalledWith('/login?redirect=%2Fshops%2Fshop-a'), {
      timeout: 3000,
    })
  })

  it('guardar un comercio que no era favorito: toast de éxito', async () => {
    renderButton()

    fireEvent.click(screen.getByRole('button'))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Comercio guardado en favoritos')
    expect(favState.toggleFavorite).toHaveBeenCalledWith('shop-a')
  })

  it('quitar un comercio que ya era favorito: el toast dice "Eliminado de favoritos"', async () => {
    favState.favorites = ['shop-a']
    renderButton()

    fireEvent.click(screen.getByRole('button'))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Eliminado de favoritos')
  })

  it('si toggleFavorite falla, no sale ningún toast (nada de falsos éxitos)', async () => {
    favState.toggleFavorite = vi.fn(async () => false)
    renderButton()

    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => expect(favState.toggleFavorite).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
