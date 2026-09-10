import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useShops } from '@/hooks/useShops'
import { supabaseBrowser } from '@/lib/supabase/client'

/**
 * Fix F1 (N+1 del directorio): useShops consultaba get_public_shop UNA VEZ
 * POR COMERCIO y en serie — cada consulta esperaba a la anterior. Estos
 * tests fijan el contrato nuevo: peticiones en paralelo (con orden
 * conservado), deduplicación de ids, errores que NO se tragan y omisión
 * limpia del comercio que dejó de ser público entre consulta y consulta.
 */

function shopPayload(id: string, name: string) {
  return {
    id,
    name,
    description: `Descripción de ${name}`,
    locality_name: 'Santiago',
    logo_path: `${id}/logo.png`,
    cover_path: null,
    rating: '4.50',
  }
}

type RpcResult = { data: unknown; error: { message: string } | null }

let rpcCalls: Array<{ name: string; params: Record<string, unknown> }>
let packRows: Array<Record<string, unknown>>
let shopResponder: (id: string) => Promise<RpcResult>

function setupSupabase() {
  rpcCalls = []
  packRows = [{ shop_id: 's1' }, { shop_id: 's2' }, { shop_id: 's1' }] // s1 duplicado a propósito
  shopResponder = (id: string) => Promise.resolve({ data: shopPayload(id, `Comercio ${id}`), error: null })
  const rpc = vi.fn().mockImplementation((name: string, params: Record<string, unknown>) => {
    rpcCalls.push({ name, params })
    if (name === 'search_available_packs') return Promise.resolve({ data: packRows, error: null })
    if (name === 'get_public_shop') return shopResponder(String(params.p_shop_id))
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

describe('useShops — directorio en paralelo y sin mentiras (F1)', () => {
  beforeEach(() => {
    setupSupabase()
  })

  it('consulta cada comercio UNA sola vez (deduplica ids) y conserva el orden', async () => {
    const { result } = renderHook(() => useShops(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.loading).toBe(false))

    const shopCalls = rpcCalls.filter((c) => c.name === 'get_public_shop').map((c) => c.params.p_shop_id)
    expect(shopCalls).toEqual(['s1', 's2']) // ni tres, ni desordenado
    expect(result.current.shops.map((s) => s.id)).toEqual(['s1', 's2'])
  })

  it('las consultas van EN PARALELO: la segunda arranca sin esperar a la primera', async () => {
    // Cerrojo manual: ninguna petición de comercio se resuelve hasta que el
    // test lo diga. Con el bucle en serie de antes, s2 NUNCA llegaba a
    // consultarse (s1 bloqueaba) y este test moría en el waitFor: si alguien
    // reintroduce el N+1, esto se pone rojo.
    const liberar: Array<() => void> = []
    shopResponder = (id: string) =>
      new Promise<RpcResult>((resolve) => {
        liberar.push(() => resolve({ data: shopPayload(id, `Comercio ${id}`), error: null }))
      })

    const { result } = renderHook(() => useShops(), { wrapper: createWrapper() })

    await waitFor(() => {
      const shopCalls = rpcCalls.filter((c) => c.name === 'get_public_shop')
      expect(shopCalls).toHaveLength(2) // ambas en vuelo a la vez
    })

    liberar.forEach((fn) => fn())
    await waitFor(() => expect(result.current.shops).toHaveLength(2))
    expect(result.current.error).toBeNull()
  })

  it('mapea la ficha pública: nombre, ciudad, logo con URL de storage y rating numérico', async () => {
    const { result } = renderHook(() => useShops(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.shops).toHaveLength(2))

    const s1 = result.current.shops[0]
    expect(s1.id).toBe('s1')
    expect(s1.name).toBe('Comercio s1')
    expect(s1.city).toBe('Santiago')
    expect(s1.logo_url).toBe('https://cdn.test/shop-images/s1/logo.png')
    expect(s1.cover_url).toBeNull()
    expect(s1.rating).toBe(4.5)
    expect(s1.verified).toBe(true) // garantizado por el WHERE de get_public_shop (0014)
  })

  it('un error de get_public_shop NO se traga: la página ve el fallo', async () => {
    shopResponder = (id: string) =>
      id === 's2'
        ? Promise.resolve({ data: null, error: { message: 'permission denied' } })
        : Promise.resolve({ data: shopPayload(id, `Comercio ${id}`), error: null })

    const { result } = renderHook(() => useShops(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(result.current.error).toContain('permission denied')
    expect(result.current.error).toContain('s2')
  })

  it('comercio que dejó de ser público entre consultas: se omite sin error', async () => {
    shopResponder = (id: string) =>
      id === 's2'
        ? Promise.resolve({ data: null, error: null }) // fila vacía: ya no es público
        : Promise.resolve({ data: shopPayload(id, `Comercio ${id}`), error: null })

    const { result } = renderHook(() => useShops(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBeNull()
    expect(result.current.shops.map((s) => s.id)).toEqual(['s1'])
  })

  it('catálogo vacío = directorio vacío, sin consultas extra', async () => {
    packRows = []
    const { result } = renderHook(() => useShops(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.shops).toEqual([])
    expect(rpcCalls.filter((c) => c.name === 'get_public_shop')).toHaveLength(0)
  })
})
