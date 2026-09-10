import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useShop } from '@/hooks/useShop'
import { supabaseBrowser } from '@/lib/supabase/client'

/**
 * L-23: el comercio rellena su Instagram y su web en el perfil, la función
 * get_public_shop los devuelve y la ficha pública sabe pintarlos como
 * enlaces… pero el mapeo de useShop los tiraba por el camino. Estos tests
 * amarran el cable de punta a punta.
 */

let lastShopPayload: Record<string, unknown>

function setupSupabase() {
  lastShopPayload = {
    id: 's1',
    name: 'Panadería Staging A centro',
    description: null,
    address: 'Calle Falsa 123',
    locality_name: 'Santiago',
    phone: '+56912345678',
    website_url: 'https://www.paporla.com/',
    instagram_handle: 'nvargal',
    latitude: '-33.45',
    longitude: '-70.66',
    logo_path: null,
    cover_path: null,
    rating: null,
  }
  const rpc = vi.fn().mockImplementation((name: string) => {
    if (name === 'get_public_shop') return Promise.resolve({ data: lastShopPayload, error: null })
    if (name === 'search_available_packs') return Promise.resolve({ data: [], error: null })
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

describe('useShop — redes y coordenadas llegan a la ficha pública (L-23)', () => {
  beforeEach(() => {
    setupSupabase()
  })

  it('mapea website_url e instagram_handle a los campos que ShopDetailInfo consume', async () => {
    const { result } = renderHook(() => useShop('s1'), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.shop?.website).toBe('https://www.paporla.com/')
    expect(result.current.shop?.instagram).toBe('nvargal')
  })

  it('mapea latitud/longitud como número para el botón de Google Maps', async () => {
    const { result } = renderHook(() => useShop('s1'), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.shop?.latitude).toBe(-33.45)
    expect(result.current.shop?.longitude).toBe(-70.66)
  })

  it('sin redes en la base: null limpio, la ficha no pinta enlaces fantasma', async () => {
    lastShopPayload = { ...lastShopPayload, website_url: null, instagram_handle: null, latitude: null, longitude: null }
    const { result } = renderHook(() => useShop('s1'), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.shop?.website).toBeNull()
    expect(result.current.shop?.instagram).toBeNull()
    expect(result.current.shop?.latitude).toBeNull()
    expect(result.current.shop?.longitude).toBeNull()
  })
})
