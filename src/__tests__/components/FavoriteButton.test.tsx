import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
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

  /**
   * Regresión: el salto al login se agendaba con 1500 ms de retardo y NUNCA se
   * cancelaba. Si el botón desaparecía de pantalla antes de ese segundo y
   * medio, la persona acababa en /login sin haberlo pedido.
   *
   * Es el mismo defecto que reventó el CI con "window is not defined" (allí
   * saltaba el de la animación, de 300 ms), pero este es el que sufre alguien
   * de verdad: pulsar el corazón sin sesión, irse a otra página y encontrarse
   * en el login.
   *
   * Se comprueba el EFECTO, no el mecanismo: que empuje o no empuje. Contar
   * temporizadores pendientes no sirve aquí porque framer-motion agenda los
   * suyos y el número no depende solo de este componente.
   */
  it('sin sesión: si el botón desaparece antes de 1,5 s, NO te manda al login', async () => {
    authState.user = null
    vi.useFakeTimers()
    try {
      const { unmount } = renderButton()

      fireEvent.click(screen.getByRole('button'))
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0)
      })

      // La persona se va de la página mucho antes de los 1,5 s.
      unmount()

      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000)
      })

      expect(push).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  /**
   * Y la cara buena de la moneda: si el botón SIGUE en pantalla, el salto al
   * login tiene que ocurrir. Sin este test, el anterior pasaría también
   * borrando la redirección a secas.
   */
  it('sin sesión: si el botón sigue en pantalla, sí te manda al login', async () => {
    authState.user = null
    vi.useFakeTimers()
    try {
      renderButton()

      fireEvent.click(screen.getByRole('button'))

      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000)
      })

      expect(push).toHaveBeenCalledWith('/login?redirect=%2F')
    } finally {
      vi.useRealTimers()
    }
  })
})
