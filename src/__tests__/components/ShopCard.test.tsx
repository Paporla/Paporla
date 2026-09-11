import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ShopCard from '@/components/shops/ShopCard'
import { ToastProvider } from '@/components/ui/ToastProvider'

/**
 * L-28: el corazón de favoritos vivía DENTRO del <Link> que envolvía toda la
 * tarjeta. `stopPropagation()` no frena la acción por defecto de un enlace, así
 * que el clic se iba a la ficha del comercio y el favorito no se guardaba.
 * Estos tests fijan la estructura nueva (enlace estirado por encima del
 * contenido, corazón por encima del enlace) para que no pueda volver.
 */
const authState = vi.hoisted(() => ({
  user: { id: 'user-a' } as { id: string } | null,
}))

const favState = vi.hoisted(() => ({
  favorites: [] as string[],
  toggleFavorite: vi.fn(async () => true),
}))

const push = vi.hoisted(() => vi.fn())

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

const shop = {
  id: 'shop-a',
  name: 'Panadería Staging A centro',
  description: 'Pan de masa madre',
  city: 'Santiago',
  cover_url: null,
  rating: 4.5,
  verified: true,
}

function renderCard() {
  return render(
    <ToastProvider>
      <ShopCard shop={shop} />
    </ToastProvider>,
  )
}

describe('ShopCard (L-28 · corazón fuera del enlace)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.user = { id: 'user-a' }
    favState.favorites = []
    favState.toggleFavorite = vi.fn(async () => true)
  })

  it('la tarjeta sigue enlazando a la ficha del comercio', () => {
    renderCard()
    const link = screen.getByRole('link', { name: `Ver ${shop.name}` })
    expect(link.getAttribute('href')).toBe('/shops/shop-a')
  })

  it('el botón de favorito NO está dentro del enlace (estructura, no apariencia)', () => {
    renderCard()
    const link = screen.getByRole('link', { name: `Ver ${shop.name}` })
    const heart = screen.getByRole('button')
    expect(link.contains(heart)).toBe(false)
  })

  it('clic en el corazón: guarda el favorito y avisa, sin irse a la ficha', async () => {
    renderCard()

    fireEvent.click(screen.getByRole('button'))

    expect(favState.toggleFavorite).toHaveBeenCalledWith('shop-a')
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Comercio guardado en favoritos')
  })

  it('sin sesión: el corazón avisa y no intenta guardar nada', async () => {
    authState.user = null
    renderCard()

    fireEvent.click(screen.getByRole('button'))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Inicia sesión para guardar favoritos')
    expect(favState.toggleFavorite).not.toHaveBeenCalled()
  })

  it('el contenido de la tarjeta se sigue viendo igual', () => {
    renderCard()
    expect(screen.getByText('Panadería Staging A centro')).toBeTruthy()
    expect(screen.getByText('Pan de masa madre')).toBeTruthy()
    expect(screen.getByText('Santiago')).toBeTruthy()
    expect(screen.getByText('Verificado')).toBeTruthy()
    expect(screen.getByText('4.5')).toBeTruthy()
  })
})
