import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useFavorites } from '@/hooks/useFavorites'
import { supabaseBrowser } from '@/lib/supabase/client'

/**
 * Lote F1 (L-06): los favoritos estaban muertos en runtime porque el hook
 * hablaba directo con tablas sin GRANT (42501 silencioso). Estos tests fijan
 * el contrato nuevo: lectura por `list_my_favorites` (0043) y escritura por
 * `set_favorite` (0009), con mapeo de la fila SQL a la forma que consumen la
 * página de favoritos y el botón de corazón.
 */

const mockUseAuth = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/useAuth', () => ({
  useAuth: mockUseAuth,
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

const FAVORITE_ROW = {
  favorite_id: 'user-1:shop-1',
  shop_id: 'shop-1',
  favorited_at: '2026-09-10T12:00:00.000Z',
  name: 'Panadería Doña Marta',
  category: 'bakery',
  locality_name: 'Santiago',
  address: 'Av. Siempre Viva 742',
  phone_e164: '+56912345678',
  verified: true,
  rating: '4.50',
  rating_count: 12,
  logo_path: 'shop-1/logo.png',
  cover_path: null,
  shop_status: 'verified',
}

let rpc: ReturnType<typeof vi.fn>
let listRows: unknown[]
let setError: { message: string } | null

function setupSupabase() {
  listRows = [FAVORITE_ROW]
  setError = null
  rpc = vi.fn().mockImplementation((name: string) => {
    if (name === 'list_my_favorites') {
      return Promise.resolve({ data: listRows, error: null })
    }
    if (name === 'set_favorite') {
      return Promise.resolve({ data: { success: true, enabled: true }, error: setError })
    }
    return Promise.resolve({ data: null, error: { message: `RPC inesperada: ${name}` } })
  })
  ;(supabaseBrowser as unknown as { mockReturnValue: (v: unknown) => void }).mockReturnValue({
    rpc,
    storage: {
      from: (bucket: string) => ({
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://cdn.test/${bucket}/${path}` } }),
      }),
    },
  })
}

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useFavorites — por RPCs, no por tablas (L-06)', () => {
  beforeEach(() => {
    setupSupabase()
    mockUseAuth.mockReturnValue({ user: { id: 'user-1', role: 'user' } })
  })

  it('lista los favoritos con list_my_favorites y mapea la fila a la forma de la UI', async () => {
    const { result } = renderHook(() => useFavorites(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(rpc).toHaveBeenCalledWith('list_my_favorites')
    // Nunca más consultas directas a tablas: el cliente mockeado ni las tiene.
    const fav = result.current.favorites[0]
    expect(fav.id).toBe('user-1:shop-1')
    expect(fav.shop_id).toBe('shop-1')
    expect(fav.shop.name).toBe('Panadería Doña Marta')
    expect(fav.shop.city).toBe('Santiago')
    expect(fav.shop.address).toBe('Av. Siempre Viva 742')
    expect(fav.shop.verified).toBe(true)
    expect(fav.shop.rating).toBe(4.5) // numeric de Postgres llega string; la UI lo quiere number
    expect(fav.shop.logo_url).toBe('https://cdn.test/shop-images/shop-1/logo.png')
    expect(fav.shop.cover_url).toBeNull()
    expect(result.current.isFavorite('shop-1')).toBe(true)
    expect(result.current.isFavorite('shop-2')).toBe(false)
  })

  it('toggleFavorite agrega con set_favorite(p_enabled: true) cuando no es favorito', async () => {
    listRows = []
    const { result } = renderHook(() => useFavorites(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))

    let ok = false
    await act(async () => {
      ok = await result.current.toggleFavorite('shop-9')
    })

    expect(ok).toBe(true)
    expect(rpc).toHaveBeenCalledWith('set_favorite', { p_shop_id: 'shop-9', p_enabled: true })
  })

  it('toggleFavorite quita con set_favorite(p_enabled: false) cuando ya es favorito', async () => {
    const { result } = renderHook(() => useFavorites(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.toggleFavorite('shop-1')
    })

    expect(rpc).toHaveBeenCalledWith('set_favorite', { p_shop_id: 'shop-1', p_enabled: false })
  })

  it('si la RPC falla, toggleFavorite devuelve false en vez de reventar (y se loggea)', async () => {
    listRows = []
    setError = { message: 'SHOP_NOT_AVAILABLE' }
    const { result } = renderHook(() => useFavorites(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))

    let ok = true
    await act(async () => {
      ok = await result.current.toggleFavorite('shop-inexistente')
    })

    expect(ok).toBe(false)
  })

  it('sin usuario no se consulta nada', () => {
    mockUseAuth.mockReturnValue({ user: null })
    const { result } = renderHook(() => useFavorites(), { wrapper: createWrapper() })

    expect(rpc).not.toHaveBeenCalled()
    expect(result.current.favorites).toEqual([])
  })
})
