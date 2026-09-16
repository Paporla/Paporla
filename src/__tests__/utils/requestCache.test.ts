import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * A-09: la deduplicación por petición.
 *
 * `cache` de React solo existe en el runtime de servidor de Next. En vitest
 * resuelve al paquete `react` plano y es `undefined`, así que aquí se
 * INYECTA una implementación falsa para poder probar las dos ramas:
 *
 *  1. Con cache disponible → la misma petición se consulta UNA sola vez.
 *  2. Sin cache disponible → se comporta como siempre y NO explota.
 *
 * Lo segundo importa tanto como lo primero: es lo que permite importar las
 * páginas desde los tests sin que revienten al cargarse el módulo.
 */

/** Implementación de `cache` suficiente para este test: memoiza por argumentos. */
function cacheDeMentira() {
  const memo = new Map<string, Promise<unknown>>()
  return (fn: (...args: unknown[]) => unknown) =>
    (...args: unknown[]) => {
      const key = JSON.stringify(args)
      if (!memo.has(key)) memo.set(key, Promise.resolve(fn(...args)))
      return memo.get(key)
    }
}

describe('requestCache', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('con cache disponible, la misma id se consulta una sola vez', async () => {
    vi.doMock('react', async (importOriginal) => {
      const actual = await importOriginal<typeof import('react')>()
      return { ...actual, cache: cacheDeMentira() }
    })

    const { requestCache } = await import('@/lib/utils/requestCache')
    const consulta = vi.fn(async (id: string) => ({ id }))
    const cargada = requestCache(consulta)

    const a = await cargada('pack-1')
    const b = await cargada('pack-1')
    const c = await cargada('pack-2')

    expect(consulta).toHaveBeenCalledTimes(2) // pack-1 y pack-2, no tres veces
    expect(a).toBe(b) // la repetida devuelve exactamente lo mismo
    expect(a).not.toBe(c) // otra id es otra consulta
  })

  it('sin cache disponible (react plano) no memoiza, pero tampoco revienta', async () => {
    vi.doMock('react', async (importOriginal) => {
      const actual = await importOriginal<typeof import('react')>()
      return { ...actual, cache: undefined }
    })

    const { requestCache } = await import('@/lib/utils/requestCache')
    const consulta = vi.fn(async (id: string) => ({ id }))
    const cargada = requestCache(consulta)

    await cargada('pack-1')
    await cargada('pack-1')

    expect(consulta).toHaveBeenCalledTimes(2)
  })
})

describe('loadPublicPack (A-09)', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  /**
   * El bug: layout, metadata de la página y cuerpo consultaban cada uno por
   * su cuenta. Con la memoización puesta, las tres peticiones a la misma id
   * se resuelven con UNA consulta a la base.
   */
  it('tres lecturas de la misma id = una sola consulta a la base', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ pack_id: 'pack-1', title: 'Pack' }], error: null })

    vi.doMock('react', async (importOriginal) => {
      const actual = await importOriginal<typeof import('react')>()
      return { ...actual, cache: cacheDeMentira() }
    })
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: async () => ({ rpc, storage: { from: () => ({ getPublicUrl: () => ({ data: {} }) }) } }),
    }))

    const { loadPublicPack } = await import('@/app/(public)/packs/[id]/loadPublicPack')

    const una = await loadPublicPack('pack-1')
    const dos = await loadPublicPack('pack-1')
    const tres = await loadPublicPack('pack-1')

    expect(rpc).toHaveBeenCalledTimes(1)
    expect(una.row).toEqual({ pack_id: 'pack-1', title: 'Pack' })
    expect(dos.row).toBe(una.row)
    expect(tres.row).toBe(una.row)
  })

  it('otra id es otra consulta: no se devuelve el pack de al lado', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ pack_id: 'pack-1', title: 'Pack 1' }], error: null })

    vi.doMock('react', async (importOriginal) => {
      const actual = await importOriginal<typeof import('react')>()
      return { ...actual, cache: cacheDeMentira() }
    })
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: async () => ({ rpc, storage: { from: () => ({ getPublicUrl: () => ({ data: {} }) }) } }),
    }))

    const { loadPublicPack } = await import('@/app/(public)/packs/[id]/loadPublicPack')

    await loadPublicPack('pack-1')
    await loadPublicPack('pack-2')

    expect(rpc).toHaveBeenCalledTimes(2)
  })
})
