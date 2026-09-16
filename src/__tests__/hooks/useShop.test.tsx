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
/** Filas que devuelve list_shop_packs (A-10). Se cambia por test. */
let lastPackRows: Record<string, unknown>[] = []
/** Espía de las RPC: permite afirmar CON QUÉ argumentos se llamó a la base. */
let rpc: ReturnType<typeof vi.fn>

function setupSupabase() {
  lastPackRows = []
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
  rpc = vi.fn().mockImplementation((name: string) => {
    if (name === 'get_public_shop') return Promise.resolve({ data: lastShopPayload, error: null })
    if (name === 'list_shop_packs') return Promise.resolve({ data: lastPackRows, error: null })
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

/**
 * A-10: la ficha de un comercio podía decir "0 packs" teniendo packs a la
 * venta, y mostraba el stock restante como si fuera el total.
 *
 * La causa: pedía `search_available_packs` SIN filtro de comercio y con el
 * tope de 50 que admite esa función para TODO el catálogo, y luego filtraba
 * en el navegador. Si más de 50 packs de otros comercios iban por delante,
 * los propios quedaban fuera del límite.
 */
describe('useShop — packs del comercio (A-10)', () => {
  beforeEach(() => {
    setupSupabase()
  })

  it('pide los packs YA filtrados por comercio, no el catálogo entero con tope de 50', async () => {
    lastPackRows = [{ pack_id: 'p1', title: 'Pack', remaining_stock: 3, total_stock: 10, image_path: null }]

    const { result } = renderHook(() => useShop('s1'), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))

    // La clave del arreglo: el comercio va en la consulta. search_available_packs
    // no admite p_shop_id, así que si alguien vuelve a ella, esto salta.
    expect(rpc).toHaveBeenCalledWith('list_shop_packs', { p_shop_id: 's1', p_limit: 50 })
    expect(rpc).not.toHaveBeenCalledWith('search_available_packs', expect.anything())
  })

  it('total_stock es el REAL: ya no copia el stock restante', async () => {
    // Antes la tarjeta decía "Stock: 3/3" aquí, cuando se vendieron 7 de 10.
    lastPackRows = [{ pack_id: 'p1', title: 'Pack', remaining_stock: 3, total_stock: 10, image_path: null }]

    const { result } = renderHook(() => useShop('s1'), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.packs).toHaveLength(1)
    expect(result.current.packs[0].remaining_stock).toBe(3)
    expect(result.current.packs[0].total_stock).toBe(10)
  })

  it('llegan TODOS los packs del comercio: el límite no se los come', async () => {
    lastPackRows = Array.from({ length: 40 }, (_, i) => ({
      pack_id: `p${i}`,
      title: `Pack ${i}`,
      remaining_stock: 1,
      total_stock: 2,
      image_path: null,
    }))

    const { result } = renderHook(() => useShop('s1'), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.packs).toHaveLength(40)
    // Y todos son de este comercio: no se cuelan packs de otro.
    expect(result.current.packs.every((p) => p.shop_id === 's1')).toBe(true)
  })

  it('si la base falla, la ficha se queda sin packs pero no se cae', async () => {
    rpc = vi.fn().mockImplementation((name: string) => {
      if (name === 'get_public_shop') return Promise.resolve({ data: lastShopPayload, error: null })
      return Promise.resolve({ data: null, error: { message: 'boom' } })
    })
    ;(supabaseBrowser as unknown as { mockReturnValue: (v: unknown) => void }).mockReturnValue({
      rpc,
      storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: '' } }) }) },
    })

    const { result } = renderHook(() => useShop('s1'), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.packs).toEqual([])
    expect(result.current.shop).not.toBeNull() // el comercio sí se pudo cargar
  })
})
