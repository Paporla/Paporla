import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import FavoritesPage from '@/app/(dashboard)/favorites/page'
import { ToastProvider } from '@/components/ui/ToastProvider'

/**
 * Piloto de la migración a toasts globales (Lote UX punto 4): quitar un
 * favorito ya no guarda el error en estado local con un <Toast> hecho a
 * mano; el aviso viaja al ToastProvider (role="alert"). El hook de datos se
 * mockea (su lógica vive en useFavorites.test).
 */
const favState = vi.hoisted(() => ({
  removeFavorite: vi.fn(),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u-1' }, loading: false }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/hooks/useFavorites', () => ({
  useFavorites: () => ({
    favorites: [
      {
        id: 'fav-1',
        shop_id: 'shop-1',
        shop: {
          id: 'shop-1',
          name: 'Panadería Staging A',
          rating: 4.5,
          verified: true,
          address: 'Calle Los Aromos 123',
          logo_url: null,
        },
      },
    ],
    loading: false,
    removeFavorite: favState.removeFavorite,
  }),
}))

function renderPage() {
  return render(
    <ToastProvider>
      <FavoritesPage />
    </ToastProvider>,
  )
}

describe('favorites page (toasts globales)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('pinta el favorito con su botón de eliminar', () => {
    favState.removeFavorite.mockResolvedValue(undefined)
    renderPage()
    expect(screen.getByText('Mis Favoritos')).toBeDefined()
    expect(screen.getByText('Panadería Staging A')).toBeDefined()
    expect(screen.getByRole('button')).toBeDefined()
  })

  it('fallo al quitar: el error sale como toast GLOBAL (role=alert)', async () => {
    favState.removeFavorite.mockRejectedValue(new Error('db down'))
    renderPage()

    fireEvent.click(screen.getByRole('button'))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Error al eliminar de favoritos')
  })

  it('éxito al quitar: llama al hook y no aparece ningún toast', async () => {
    favState.removeFavorite.mockResolvedValue(undefined)
    renderPage()

    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => expect(favState.removeFavorite).toHaveBeenCalledWith('shop-1'))
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
