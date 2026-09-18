import { describe, expect, it } from 'vitest'
import { seo } from '@/lib/seo'

describe('seo()', () => {
  it('pone canonical y og:url con la ruta limpia', () => {
    const md = seo('/packs')
    expect(md.alternates).toEqual({ canonical: '/packs' })
    expect(md.openGraph).toEqual({ url: '/packs' })
  })

  it('conserva el title y la description que ya traía la página', () => {
    const md = seo('/faq', { title: 'Preguntas', description: 'Las dudas de siempre.' })
    expect(md.title).toBe('Preguntas')
    expect(md.description).toBe('Las dudas de siempre.')
    expect(md.alternates).toEqual({ canonical: '/faq' })
  })

  it('no pisa el openGraph que la página ya tenía, solo le suma la url', () => {
    const md = seo('/packs/pack-1', {
      openGraph: { title: 'Pack | Paporla', images: [{ url: '/x.png' }] },
    })
    expect(md.openGraph).toEqual({
      title: 'Pack | Paporla',
      images: [{ url: '/x.png' }],
      url: '/packs/pack-1',
    })
  })
})
