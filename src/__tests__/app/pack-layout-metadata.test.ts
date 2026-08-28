import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * /packs/[id] metadata (Fase 8): los metadatos salen de get_pack_public
 * (0029+0030, GRANT anon) — el .from('packs') legacy lo negaba el esquema 0012
 * (42501) y por eso compartir un pack en WhatsApp no mostraba título ni foto.
 * Protege: nombre exacto de la RPC, precio con formato CLP canónico
 * (formatChilePesos), imagen OG desde el bucket público pack-images y el
 * fallback genérico cuando no hay pack o la DB falla.
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

const filaPack = {
  title: 'Pack de sushi sorpresa',
  description: null,
  price_minor: 3990,
  currency_code: 'CLP',
  image_path: 'shop-a/pack-a/abc123.jpg',
}

async function metadata(id = 'pack-1') {
  const { generateMetadata } = await import('@/app/(public)/packs/[id]/layout')
  return generateMetadata({ params: Promise.resolve({ id }) })
}

describe('metadata /packs/[id] con get_pack_public (Fase 8)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('título, descripción canónica con $3.990 e imagen OG desde pack-images', async () => {
    mock.rpc.mockResolvedValue({ data: [filaPack], error: null })
    mock.getPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://cdn.supabase.co/bucket/shop-a/pack-a/abc123.jpg' },
    })

    const md = await metadata()

    expect(mock.rpc).toHaveBeenCalledWith('get_pack_public', { p_pack_id: 'pack-1' })
    expect(md.title).toBe('Pack de sushi sorpresa')
    expect(md.description).toContain('$3.990')
    expect(md.openGraph?.title).toBe('Pack de sushi sorpresa | Paporla')
    expect(md.openGraph?.images).toEqual([
      { url: 'https://cdn.supabase.co/bucket/shop-a/pack-a/abc123.jpg', alt: 'Pack de sushi sorpresa' },
    ])
  })

  it('usa la description del pack cuando existe (no inventa otra)', async () => {
    mock.rpc.mockResolvedValue({ data: [{ ...filaPack, description: 'Todo roll del día, 12 piezas' }], error: null })
    mock.getPublicUrl.mockReturnValue({ data: { publicUrl: 'https://cdn.supabase.co/x.jpg' } })

    const md = await metadata()

    expect(md.description).toBe('Todo roll del día, 12 piezas')
  })

  it('sin imagen → images undefined (título sí se comparte)', async () => {
    mock.rpc.mockResolvedValue({ data: [{ ...filaPack, image_path: null }], error: null })

    const md = await metadata()

    expect(mock.getPublicUrl).not.toHaveBeenCalled()
    expect(md.openGraph?.images).toBeUndefined()
    expect(md.openGraph?.title).toBe('Pack de sushi sorpresa | Paporla')
  })

  it('RPC vacía (pack borrado o no visible) → metadata genérica', async () => {
    mock.rpc.mockResolvedValue({ data: [], error: null })

    const md = await metadata()

    expect(md.title).toBe('Pack')
    expect(md.description).toContain('Paporla')
  })

  it('error en la RPC → metadata genérica (no rompe la página)', async () => {
    mock.rpc.mockRejectedValue(new Error('permission denied for table packs'))

    const md = await metadata()

    expect(md.title).toBe('Pack')
  })
})
