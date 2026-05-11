import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://paporla.com'

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

  // Páginas dinámicas: packs activos
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: packs } = await supabase
      .from('packs')
      .select('id, updated_at')
      .eq('is_active', true)
      .limit(100)

    const packPages = (packs || []).map((pack) => ({
      url: `${siteUrl}/packs/${pack.id}`,
      lastModified: new Date(pack.updated_at || Date.now()),
      changeFrequency: 'hourly' as const,
      priority: 0.8,
    }))

    // Páginas dinámicas: comercios
    const { data: shops } = await supabase
      .from('shops')
      .select('id, updated_at')
      .limit(100)

    const shopPages = (shops || []).map((shop) => ({
      url: `${siteUrl}/shops/${shop.id}`,
      lastModified: new Date(shop.updated_at || Date.now()),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))

    return [...staticPages, ...packPages, ...shopPages]
  } catch (error) {
    // Si falla la DB, devolver solo páginas estáticas
    console.error('Error generando sitemap dinámico:', error)
    return staticPages
  }
}
