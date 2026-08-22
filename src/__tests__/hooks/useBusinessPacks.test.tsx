import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useBusinessPacks } from '@/components/business/packs/useBusinessPacks'
import { supabaseBrowser } from '@/lib/supabase/client'

const mockUseAuth = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/useAuth', () => ({
  useAuth: mockUseAuth,
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

let rpc: ReturnType<typeof vi.fn>

function listed(title: string, status = 'active', packId?: string) {
  return {
    pack_id: packId ?? `p-${title.toLowerCase().replace(/\s+/g, '-')}`,
    title,
    status,
    price_minor: 3990,
    currency_code: 'CLP',
    total_stock: 10,
    remaining_stock: 5,
    pickup_end_at: null,
  }
}

/**
 * @param rows      packs que devuelve `list_my_packs`
 * @param rpcErrors error a devolver para una RPC concreta, p. ej. `{ publish_pack: {...} }`
 */
function setupMockClient(
  rows: ReturnType<typeof listed>[] = [],
  rpcErrors: Record<string, { message: string; code?: string }> = {},
) {
  rpc = vi.fn().mockImplementation((name: string) => {
    if (rpcErrors[name]) {
      return Promise.resolve({ data: null, error: rpcErrors[name] })
    }
    if (name === 'get_my_shop') {
      return Promise.resolve({
        data: {
          shop: {
            id: 'shop-1',
            name: 'Shop 1',
            status: 'verified',
            logo_path: null,
            description: null,
            address_line1: null,
            phone_e164: null,
            latitude: null,
            longitude: null,
            locality_id: null,
          },
        },
        error: null,
      })
    }
    if (name === 'list_my_packs') {
      return Promise.resolve({ data: rows, error: null })
    }
    return Promise.resolve({ data: { success: true }, error: null })
  })
  ;(supabaseBrowser as any).mockReturnValue({ rpc, from: vi.fn() })
}

describe('useBusinessPacks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMockClient()
    mockUseAuth.mockReturnValue({ user: { id: 'user-1', name: 'Test' } })
  })

  it('starts with empty packs', () => {
    const { result } = renderHook(() => useBusinessPacks(), { wrapper: createWrapper() })
    expect(result.current.packs).toEqual([])
  })

  it('resolves shopId when shop query succeeds', async () => {
    const { result } = renderHook(() => useBusinessPacks(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.shopId).toBe('shop-1'))
    expect(rpc).toHaveBeenCalledWith('get_my_shop')
  })

  it('fetches packs for the shop when shop is loaded', async () => {
    setupMockClient([listed('Pack 1'), listed('Pack 2', 'draft')])
    const { result } = renderHook(() => useBusinessPacks(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.shopId).toBe('shop-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(rpc).toHaveBeenCalledWith('list_my_packs', {
      p_before_created_at: null,
      p_before_pack_id: null,
      p_limit: 50,
    })
    expect(result.current.packs.map((p) => p.title)).toEqual(['Pack 1', 'Pack 2'])
  })

  it('filters packs by search term', async () => {
    setupMockClient([listed('Pan Artesanal'), listed('Croissant')])
    const { result } = renderHook(() => useBusinessPacks(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => {
      result.current.setSearchTerm('pan')
    })
    expect(result.current.packs).toHaveLength(1)
    expect(result.current.packs[0].title).toBe('Pan Artesanal')
  })

  it('oculta los packs archivados', async () => {
    setupMockClient([listed('Visible', 'active'), listed('Borrado', 'archived')])
    const { result } = renderHook(() => useBusinessPacks(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.packs.map((p) => p.title)).toEqual(['Visible'])
  })

  describe('changePackState: elige la RPC según el estado actual', () => {
    it('un borrador se publica con publish_pack', async () => {
      setupMockClient([listed('Borrador', 'draft', 'p-1')])
      const { result } = renderHook(() => useBusinessPacks(), { wrapper: createWrapper() })
      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        await result.current.changePackState('p-1')
      })

      expect(rpc).toHaveBeenCalledWith('publish_pack', { p_pack_id: 'p-1' })
      expect(result.current.error).toBe('')
      expect(result.current.success).toMatch(/publicado/i)
    })

    it('un pack activo se pausa con set_pack_paused(true)', async () => {
      setupMockClient([listed('Activo', 'active', 'p-2')])
      const { result } = renderHook(() => useBusinessPacks(), { wrapper: createWrapper() })
      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        await result.current.changePackState('p-2')
      })

      expect(rpc).toHaveBeenCalledWith('set_pack_paused', { p_pack_id: 'p-2', p_paused: true })
      expect(result.current.success).toMatch(/pausado/i)
    })

    it('un pack pausado se reanuda con set_pack_paused(false), no con publish_pack', async () => {
      setupMockClient([listed('Pausado', 'paused', 'p-3')])
      const { result } = renderHook(() => useBusinessPacks(), { wrapper: createWrapper() })
      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        await result.current.changePackState('p-3')
      })

      expect(rpc).toHaveBeenCalledWith('set_pack_paused', { p_pack_id: 'p-3', p_paused: false })
      expect(rpc).not.toHaveBeenCalledWith('publish_pack', expect.anything())
    })

    it('un pack agotado no dispara ninguna RPC de estado', async () => {
      setupMockClient([listed('Agotado', 'sold_out', 'p-4')])
      const { result } = renderHook(() => useBusinessPacks(), { wrapper: createWrapper() })
      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        await result.current.changePackState('p-4')
      })

      expect(rpc).not.toHaveBeenCalledWith('publish_pack', expect.anything())
      expect(rpc).not.toHaveBeenCalledWith('set_pack_paused', expect.anything())
      expect(result.current.error).toMatch(/no admite cambios/i)
    })

    it('un id inexistente no lanza excepción', async () => {
      setupMockClient([])
      const { result } = renderHook(() => useBusinessPacks(), { wrapper: createWrapper() })
      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        await result.current.changePackState('no-existe')
      })

      expect(result.current.error).toMatch(/no se encontró/i)
    })
  })

  describe('errores de la base de datos', () => {
    it('traduce el error de Supabase en vez de mostrar el código crudo', async () => {
      setupMockClient([listed('Borrador', 'draft', 'p-1')], {
        publish_pack: { message: 'SHOP_NOT_VERIFIED', code: 'P0001' },
      })
      const { result } = renderHook(() => useBusinessPacks(), { wrapper: createWrapper() })
      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        await result.current.changePackState('p-1')
      })

      // Los errores de Supabase son objetos planos, no `instanceof Error`.
      expect(result.current.error).not.toBe('SHOP_NOT_VERIFIED')
      expect(result.current.error).toMatch(/no está verificado/i)
    })

    it('nunca deja el indicador de carga colgado tras un error', async () => {
      setupMockClient([listed('Activo', 'active', 'p-2')], {
        set_pack_paused: { message: 'PACK_NOT_ACTIVE', code: 'P0001' },
      })
      const { result } = renderHook(() => useBusinessPacks(), { wrapper: createWrapper() })
      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        await result.current.changePackState('p-2')
      })

      expect(result.current.updatingPackId).toBeNull()
    })
  })
})
