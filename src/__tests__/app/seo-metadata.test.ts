import { describe, it, expect } from 'vitest'

/**
 * SEO-1: títulos y descripciones PROPIOS por página pública.
 *
 * Las páginas son 'use client' y no pueden exportar metadata: el título vive
 * en el layout de servidor que envuelve la ruta (patrón del paso 44b). Si
 * alguien borra un layout o le quita el título, la página vuelve a heredar
 * "Paporla - Rescate Alimentario" y este test lo caza.
 *
 * Política de canonical (src/lib/seo.ts): las 4 rutas de exploración/
 * institucionales llevan canonical vía seo(); las legales van planas a
 * propósito (nadie las enlaza con parámetros).
 */

import { metadata as shopsMeta } from '@/app/(public)/shops/layout'
import { metadata as aboutMeta } from '@/app/(public)/about/layout'
import { metadata as faqMeta } from '@/app/(public)/faq/layout'
import { metadata as contactoMeta } from '@/app/(public)/contacto/layout'
import { metadata as terminosMeta } from '@/app/(public)/legal/terminos/layout'
import { metadata as privacidadMeta } from '@/app/(public)/legal/privacidad/layout'
import { metadata as cookiesMeta } from '@/app/(public)/legal/cookies/layout'
import { metadata as legalBasesMeta } from '@/app/(public)/legal/legal-bases/layout'
import { metadata as politicasRetiroMeta } from '@/app/(public)/legal/politicas-retiro/layout'

describe('SEO-1: títulos y descripciones propios por página', () => {
  it('/shops: título, descripción y canonical propios', () => {
    expect(shopsMeta.title).toBe('Comercios Aliados')
    expect(String(shopsMeta.description)).toContain('aliados')
    expect(String(shopsMeta.alternates?.canonical)).toBe('/shops')
  })

  it('/about: título y descripción propios', () => {
    expect(aboutMeta.title).toBe('Quiénes Somos')
    expect(String(aboutMeta.description)).toContain('misión')
    expect(String(aboutMeta.alternates?.canonical)).toBe('/about')
  })

  it('/faq: título y descripción propios', () => {
    expect(faqMeta.title).toBe('Preguntas Frecuentes')
    expect(String(faqMeta.description)).toContain('pack')
    expect(String(faqMeta.alternates?.canonical)).toBe('/faq')
  })

  it('/contacto: título y descripción propios', () => {
    expect(contactoMeta.title).toBe('Contacto')
    expect(String(contactoMeta.alternates?.canonical)).toBe('/contacto')
  })

  it('las 5 legales tienen título propio (calcado de su H1)', () => {
    expect(terminosMeta.title).toBe('Términos y Condiciones')
    expect(privacidadMeta.title).toBe('Política de Privacidad')
    expect(cookiesMeta.title).toBe('Política de Cookies')
    expect(legalBasesMeta.title).toBe('Bases Legales')
    expect(politicasRetiroMeta.title).toBe('Políticas de Retiro y Cancelación')
  })

  it('las legales llevan descripción y NO canonical (política de seo())', () => {
    expect(String(terminosMeta.description)).toContain('Paporla')
    expect(terminosMeta.alternates).toBeUndefined()
    expect(politicasRetiroMeta.alternates).toBeUndefined()
  })
})
