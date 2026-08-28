import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * /shops/[id] metadata (Fase 8): los metadatos salen de get_public_shop
 * (0014, GRANT anon) — el .from('shops') legacy lo negaba el esquema 0012
 * (42501) y leía columnas inexistentes (city, logo_url). Protege: nombre
 * exacto de la RPC, imagen OG con respaldo logo→portada desde el bucket
 * público shop-images y el fallback genérico.
 */

const mock = vi.hoisted(() => ({
  rpc: vi.fn(),
  getPublicUrl: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    rpc: mock.rpc,
    storage: {
      from: (bucket: string) => ({
        getPublicUrl: (path: string) => mock.getPublicUrl(bucket, path),
      }),
    },
  }),
}))

const filaShop = {
  name: 'Panadería Staging A',
  description: null,
  locality_name: 'Santiago',
  logo_path: 'shop-a/logo.png',
  cover_path: 'shop-a/cover.png',
}

async function metadata(id = 'shop-1') {
  const { generateMetadata } = await import('@/app/(public)/shops/[id]/layout')
  return generateMetadata({ params: Promise.resolve({ id }) })
}

describe('metadata /shops/[id] con get_public_shop (Fase 8)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('título, descripción con localidad e imagen OG desde shop-images (logo)', async () => {
    mock.rpc.mockResolvedValue({ data: filaShop, error: null })
    mock.getPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://cdn.supabase.co/bucket/shop-a/logo.png' },
    })

    const md = await metadata()

    expect(mock.rpc).toHaveBeenCalledWith('get_public_shop', { p_shop_id: 'shop-1' })
    expect(md.title).toBe('Panadería Staging A')
    expect(md.description).toContain('Santiago')
    expect(md.description).toContain('Panadería Staging A')
    expect(md.openGraph?.title).toBe('Panadería Staging A | Paporla')
    expect(mock.getPublicUrl).toHaveBeenCalledWith('shop-images', 'shop-a/logo.png')
    expect(md.openGraph?.images).toEqual([
      { url: 'https://cdn.supabase.co/bucket/shop-a/logo.png', alt: 'Panadería Staging A' },
    ])
  })

  it('sin logo → usa la portada como respaldo', async () => {
    mock.rpc.mockResolvedValue({ data: { ...filaShop, logo_path: null }, error: null })
    mock.getPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://cdn.supabase.co/bucket/shop-a/cover.png' },
    })

    const md = await metadata()

    expect(mock.getPublicUrl).toHaveBeenCalledWith('shop-images', 'shop-a/cover.png')
    expect(md.openGraph?.images).toEqual([
      { url: 'https://cdn.supabase.co/bucket/shop-a/cover.png', alt: 'Panadería Staging A' },
    ])
  })

  it('usa la description del comercio cuando existe', async () => {
    mock.rpc.mockResolvedValue({ data: { ...filaShop, description: 'Pan recién horneado cada mañana' }, error: null })
    mock.getPublicUrl.mockReturnValue({ data: { publicUrl: 'https://cdn.supabase.co/x.png' } })

    const md = await metadata()

    expect(md.description).toBe('Pan recién horneado cada mañana')
  })

  it('comercio no verificado (RPC null) → metadata genérica', async () => {
    mock.rpc.mockResolvedValue({ data: null, error: null })

    const md = await metadata()

    expect(md.title).toBe('Comercio')
  })

  it('error en la RPC → metadata genérica (no rompe la página)', async () => {
    mock.rpc.mockRejectedValue(new Error('permission denied for table shops'))

    const md = await metadata()

    expect(md.title).toBe('Comercio')
  })
})
