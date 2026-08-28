import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * Sitemap (Fase 8): las páginas dinámicas salen de las RPCs de 0035
 * (list_public_packs por mercado + list_public_shops, GRANT anon) — el
 * .from() legacy fallaba con 42501 y usaba la columna inexistente 'is_active'.
 * Protege: los argumentos canónicos de las RPCs, la URL y lastModified de cada
 * página, y el fallback a solo-estáticas sin env vars o con error de DB.
 */

const mock = vi.hoisted(() => ({
  marketsData: [] as { id: string }[],
  marketsShouldFail: false,
  rpc: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => {
      if (table === 'markets') {
        return {
          select: () => ({
            in: () => {
              if (mock.marketsShouldFail) {
                return Promise.reject(new Error('boom'))
              }
              return Promise.resolve({ data: mock.marketsData, error: null })
            },
          }),
        }
      }
      throw new Error(`tabla inesperada en el sitemap: ${table}`)
    },
    rpc: mock.rpc,
  }),
}))

async function loadSitemap() {
  const mod = await import('@/app/sitemap')
  return mod.default()
}

describe('sitemap con list_public_packs + list_public_shops (0035, Fase 8)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mock.marketsData = [{ id: 'm-chi' }]
    mock.marketsShouldFail = false
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.paporla.com')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://staging.example.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-test')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('8 estáticas + packs por mercado + comercios, con lastModified real', async () => {
    mock.rpc.mockImplementation((name: string) => {
      if (name === 'list_public_packs') {
        return Promise.resolve({
          data: [{ pack_id: 'pack-1', updated_at: '2026-08-01T12:00:00.000Z' }],
          error: null,
        })
      }
      return Promise.resolve({
        data: [{ shop_id: 'shop-1', updated_at: null }],
        error: null,
      })
    })

    const pages = await loadSitemap()

    expect(mock.rpc).toHaveBeenCalledWith('list_public_packs', { p_market_id: 'm-chi', p_limit: 50 })
    expect(mock.rpc).toHaveBeenCalledWith('list_public_shops', { p_limit: 100 })
    expect(pages).toHaveLength(10)
    expect(pages).toContainEqual({
      url: 'https://www.paporla.com/packs/pack-1',
      lastModified: new Date('2026-08-01T12:00:00.000Z'),
      changeFrequency: 'hourly',
      priority: 0.8,
    })
    const shopPage = pages.find((p) => p.url === 'https://www.paporla.com/shops/shop-1')
    expect(shopPage?.priority).toBe(0.7)
    expect(shopPage?.lastModified).toBeInstanceOf(Date)
    expect(pages[0].url).toBe('https://www.paporla.com')
  })

  it('sin env vars de Supabase → solo páginas estáticas', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')

    const pages = await loadSitemap()

    expect(mock.rpc).not.toHaveBeenCalled()
    expect(pages).toHaveLength(8)
  })

  it('error en la DB → solo páginas estáticas (no rompe el build)', async () => {
    mock.marketsShouldFail = true

    const pages = await loadSitemap()

    expect(pages).toHaveLength(8)
  })

  it('sin mercados habilitados → sin páginas de packs (los comercios sí se listan)', async () => {
    mock.marketsData = []
    mock.rpc.mockImplementation((name: string) => {
      if (name === 'list_public_shops') {
        return Promise.resolve({
          data: [{ shop_id: 'shop-1', updated_at: null }],
          error: null,
        })
      }
      return Promise.resolve({ data: [], error: null })
    })

    const pages = await loadSitemap()

    expect(mock.rpc).toHaveBeenCalledTimes(1)
    expect(mock.rpc).toHaveBeenCalledWith('list_public_shops', { p_limit: 100 })
    expect(mock.rpc).not.toHaveBeenCalledWith('list_public_packs', expect.anything())
    expect(pages).toHaveLength(9) // 8 estáticas + 1 comercio (sin mercados no hay packs)
  })
})
