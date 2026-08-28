import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

const MAX_PACKS_PER_MARKET = 50
const MAX_SHOPS = 100

/**
 * Fase 8: las páginas dinámicas salen de las RPCs canónicas de 0035
 * (list_public_packs + list_public_shops, GRANT anon) en vez del .from()
 * legacy: el esquema 0012 niega el SELECT a packs/shops (42501) y la columna
 * 'is_active' no existe (es status). markets SÍ es legible por anon (0012),
 * así que el sitemap itera los mercados pilot/active y pide los packs por
 * mercado (search_available_packs no expone updated_at: por eso la RPC nueva).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://paporla.com'

  // Páginas estáticas
  const staticPages = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    {
      url: `${siteUrl}/packs`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
      url: `${siteUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
    {
      url: `${siteUrl}/faq`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
    {
      url: `${siteUrl}/contacto`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.4,
    },
    {
      url: `${siteUrl}/legal/terminos`,
      lastModified: new Date(),
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    },
    {
      url: `${siteUrl}/legal/privacidad`,
      lastModified: new Date(),
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    },
    {
      url: `${siteUrl}/legal/cookies`,
      lastModified: new Date(),
      changeFrequency: 'yearly' as const,
      priority: 0.2,
    },
  ]

  // Páginas dinámicas: packs (por mercado pilot/active) y comercios verificados
  // ANON key es suficiente: las RPCs de 0035 tienen GRANT anon.
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Sitemap: NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY no configurados')
      return staticPages
    }
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const { data: markets } = await supabase.from('markets').select('id').in('status', ['pilot', 'active'])

    const packPages: MetadataRoute.Sitemap = []
    for (const market of (markets ?? []) as { id: string }[]) {
      const { data: packs } = await supabase.rpc('list_public_packs', {
        p_market_id: market.id,
        p_limit: MAX_PACKS_PER_MARKET,
      })
      for (const pack of (packs ?? []) as { pack_id: string; updated_at: string | null }[]) {
        packPages.push({
          url: `${siteUrl}/packs/${pack.pack_id}`,
          lastModified: pack.updated_at ? new Date(pack.updated_at) : new Date(),
          changeFrequency: 'hourly' as const,
          priority: 0.8,
        })
      }
    }

    const { data: shops } = await supabase.rpc('list_public_shops', { p_limit: MAX_SHOPS })

    const shopPages: MetadataRoute.Sitemap = ((shops ?? []) as { shop_id: string; updated_at: string | null }[]).map(
      (shop) => ({
        url: `${siteUrl}/shops/${shop.shop_id}`,
        lastModified: shop.updated_at ? new Date(shop.updated_at) : new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }),
    )

    return [...staticPages, ...packPages, ...shopPages]
  } catch (error) {
    // Si falla la DB, devolver solo páginas estáticas
    console.error('Error generando sitemap dinámico:', error)
    return staticPages
  }
}
