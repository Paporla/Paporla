import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'

/**
 * Página /packs/[id] con get_pack_public (migración 0029).
 *
 * Lo que se protege aquí:
 *  1. El nombre EXACTO del parámetro del RPC (p_pack_id): si cambia,
 *     PostgREST responde "Could not find the function" (mismo fallo que
 *     tuvo cancel_reservation con p_cancel_reason) y este test lo atrapa.
 *  2. El mapeo fila → SerializedPack (bigint a number, imagen vía storage).
 *  3. El 404 honesto: pack inexistente / mercado cerrado / RPC en error.
 */

const mock = vi.hoisted(() => {
  const rpc = vi.fn()
  const notFound = vi.fn(() => {
    throw new Error('NOT_FOUND_SENTINEL')
  })
  return {
    rpc,
    notFound,
    clientProps: null as unknown,
  }
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    rpc: mock.rpc,
    storage: {
      from: () => ({
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://cdn.test/${path}` } }),
      }),
    },
  }),
}))

vi.mock('next/navigation', () => ({
  notFound: mock.notFound,
}))

vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-nonce': 'nonce-test' }),
}))

vi.mock('@/app/(public)/packs/[id]/PackDetailClient', () => ({
  default: (props: { initialPack: unknown }) => {
    mock.clientProps = props
    return null
  },
}))

/**
 * Fila de get_pack_public tal como llega por PostgREST: los bigint viajan
 * como STRING. Queda agotado (stock 0): justo el caso que antes daba 404.
 */
const filaPack = {
  pack_id: 'pack-1',
  shop_id: 'shop-1',
  title: 'Pack Sushi Sorpresa',
  description: 'Sobras premium de sushi',
  category: 'sushi',
  allergen_notice: null,
  price_minor: '7990',
  original_price_minor: '9990',
  currency_code: 'CLP',
  remaining_stock: 0,
  pickup_start_at: '2026-09-30T22:00:00Z',
  pickup_end_at: '2026-10-01T03:00:00Z',
  timezone: 'America/Santiago',
  image_path: 'packs/pack-1.jpg',
  shop_name: 'Panadería Staging A centro',
  locality_name: 'Providencia',
  shop_address: 'Calle Los Aromos 123',
  shop_rating: 4.8,
}

beforeEach(() => {
  vi.clearAllMocks()
  mock.clientProps = null
})

async function loadPage(id: string) {
  const mod = await import('@/app/(public)/packs/[id]/page')
  // La página devuelve un elemento JSX: hay que renderizarlo para que el
  // (mock de) PackDetailClient se ejecute y podamos inspeccionar sus props.
  const element = await mod.default({ params: Promise.resolve({ id }) })
  render(element)
  return element
}

describe('/packs/[id] con get_pack_public (migración 0029)', () => {
  it('busca el pack con el nombre exacto del parámetro (p_pack_id)', async () => {
    mock.rpc.mockResolvedValue({ data: [filaPack], error: null })
    await loadPage('pack-1')
    expect(mock.rpc).toHaveBeenCalledWith('get_pack_public', { p_pack_id: 'pack-1' })
  })

  it('mapea una fila AGOTADA al shape de la página (precio a number, stock 0, imagen vía storage)', async () => {
    mock.rpc.mockResolvedValue({ data: [filaPack], error: null })
    await loadPage('pack-1')
    const { initialPack } = mock.clientProps as { initialPack: Record<string, unknown> }
    expect(initialPack.id).toBe('pack-1')
    expect(initialPack.title).toBe('Pack Sushi Sorpresa')
    expect(initialPack.price_minor).toBe(7990)
    expect(typeof initialPack.price_minor).toBe('number')
    expect(initialPack.remaining_stock).toBe(0)
    expect(initialPack.image_url).toBe('https://cdn.test/packs/pack-1.jpg')
    expect((initialPack.shop as Record<string, unknown>).name).toBe('Panadería Staging A centro')
  })

  it('sin image_path, image_url es null (no rompe)', async () => {
    mock.rpc.mockResolvedValue({ data: [{ ...filaPack, image_path: null }], error: null })
    await loadPage('pack-1')
    const { initialPack } = mock.clientProps as { initialPack: Record<string, unknown> }
    expect(initialPack.image_url).toBeNull()
  })

  it('pack inexistente (o mercado cerrado): la página da 404 honesto', async () => {
    mock.rpc.mockResolvedValue({ data: [], error: null })
    await expect(loadPage('no-existe')).rejects.toThrow('NOT_FOUND_SENTINEL')
    expect(mock.notFound).toHaveBeenCalled()
  })

  it('si el RPC falla, la página da 404 en vez de romper', async () => {
    mock.rpc.mockResolvedValue({ data: null, error: { message: 'INTERNAL', code: 'P0001' } })
    await expect(loadPage('pack-1')).rejects.toThrow('NOT_FOUND_SENTINEL')
    expect(mock.notFound).toHaveBeenCalled()
  })

  it('no fuerza dinámico: un 404 debe responder HTTP 404, no 200 (f8.5)', async () => {
    // force-dynamic abría el stream antes del notFound() y el status quedaba 200.
    // La página ya es dinámica por headers() (nonce CSP).
    const mod = await import('@/app/(public)/packs/[id]/page')
    expect((mod as Record<string, unknown>).dynamic).toBeUndefined()
  })
})
