import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useShops } from '@/hooks/useShops'
import { supabaseBrowser } from '@/lib/supabase/client'
import { DEFAULT_MARKET } from '@/lib/constants/markets'

/**
 * L-42 (Lote Escaparate, commit B): el directorio deja de depender de los
 * packs a la venta. Estos tests jubilan los del N+1 de F1 (el bucle en serie y
 * el Promise.all de get_public_shop ya no existen) y fijan el contrato nuevo:
 * UNA sola RPC (`list_directory_shops`, 0047) con mercado y límite, y comercios
 * SIN packs que aparecen igual que los que sí tienen.
 */

function directoryRow(id: string, over: Record<string, unknown> = {}) {
  return {
    shop_id: id,
    name: `Comercio ${id}`,
    description: `Descripción de ${id}`,
    locality_name: 'Santiago',
    logo_path: `${id}/logo.png`,
    cover_path: null,
    rating: 4.5,
    rating_count: 3,
    has_available_packs: true,
    available_pack_count: 2,
    updated_at: '2026-09-14T00:00:00.000Z',
    ...over,
  }
}

type RpcResult = { data: unknown; error: { message: string } | null }

let rpcCalls: Array<{ name: string; params: Record<string, unknown> }>
let rows: Array<Record<string, unknown>>
let rpcError: { message: string } | null

function setupSupabase() {
  rpcCalls = []
  rows = [directoryRow('s1'), directoryRow('s2')]
  rpcError = null
  const rpc = vi.fn().mockImplementation((name: string, params: Record<string, unknown>) => {
    rpcCalls.push({ name, params })
    if (name === 'list_directory_shops') return Promise.resolve({ data: rows, error: rpcError } as RpcResult)
    return Promise.resolve({ data: null, error: { message: `RPC inesperada: ${name}` } } as RpcResult)
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

describe('useShops — directorio completo en un solo viaje (L-42)', () => {
  beforeEach(() => {
    setupSupabase()
  })

  it('UNA sola consulta a la base: list_directory_shops con mercado y límite', async () => {
    const { result } = renderHook(() => useShops(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(rpcCalls).toHaveLength(1) // ni N+1 ni Promise.all: un viaje
    expect(rpcCalls[0].name).toBe('list_directory_shops')
    expect(rpcCalls[0].params).toEqual({ p_market_id: DEFAULT_MARKET.id, p_limit: 100 })
  })

  it('mapea la fila de 0047: ciudad, logo con URL de storage, rating numérico y disponibilidad', async () => {
    const { result } = renderHook(() => useShops(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.shops).toHaveLength(2))

    const s1 = result.current.shops[0]
    expect(s1.id).toBe('s1')
    expect(s1.name).toBe('Comercio s1')
    expect(s1.city).toBe('Santiago')
    expect(s1.logo_url).toBe('https://cdn.test/shop-images/s1/logo.png')
    expect(s1.cover_url).toBeNull()
    expect(s1.rating).toBe(4.5)
    expect(s1.verified).toBe(true) // garantía del WHERE de 0047, no dato fabricado
    expect(s1.has_available_packs).toBe(true)
    expect(s1.available_pack_count).toBe(2)
  })

  it('L-42: un comercio SIN packs a la venta aparece igual que los que sí tienen', async () => {
    rows = [directoryRow('s1'), directoryRow('s2', { has_available_packs: false, available_pack_count: 0 })]

    const { result } = renderHook(() => useShops(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.shops).toHaveLength(2))

    expect(result.current.shops.map((s) => s.id)).toEqual(['s1', 's2'])
    expect(result.current.shops[1].has_available_packs).toBe(false)
    expect(result.current.shops[1].available_pack_count).toBe(0)
  })

  it('un error de la RPC NO se traga: la página ve el fallo', async () => {
    rpcError = { message: 'permission denied' }

    const { result } = renderHook(() => useShops(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(result.current.error).toContain('permission denied')
  })

  it('mercado sin comercios = lista vacía, sin consultas extra', async () => {
    rows = []

    const { result } = renderHook(() => useShops(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.shops).toEqual([])
    expect(result.current.error).toBeNull()
    expect(rpcCalls).toHaveLength(1)
  })
})
