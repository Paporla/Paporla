import type { Metadata } from 'next'
import { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'

interface Props {
  children: ReactNode
  params: Promise<{ id: string }>
}

interface MetadataProps {
  params: Promise<{ id: string }>
}

const FALLBACK_METADATA: Metadata = {
  title: 'Comercio',
  description: 'Conoce este comercio asociado en Paporla.',
}

/**
 * Fase 8: los metadatos salen de la RPC canónica get_public_shop (0014, GRANT
 * anon) en vez del .from('shops') legacy, que el esquema 0012 niega (42501) y
 * que además leía columnas inexistentes (city, logo_url). La imagen OG usa el
 * logo (o la portada como respaldo) del bucket público shop-images.
 */
export async function generateMetadata({ params }: MetadataProps): Promise<Metadata> {
  const { id } = await params

  try {
    const supabase = await createClient()

    const { data: shop } = await supabase.rpc('get_public_shop', { p_shop_id: id })

    const row = shop as {
      name: string
      description: string | null
      locality_name: string | null
      logo_path: string | null
      cover_path: string | null
    } | null

    if (row) {
      const imageKey = row.logo_path ?? row.cover_path
      let ogImage: string | undefined
      if (imageKey) {
        const { data } = supabase.storage.from('shop-images').getPublicUrl(imageKey)
        ogImage = data.publicUrl || undefined
      }

      const description =
        row.description ?? `Visita ${row.name} en ${row.locality_name ?? 'tu ciudad'} y descubre sus packs sorpresa.`

      return {
        title: row.name,
        description,
        openGraph: {
          type: 'website',
          title: `${row.name} | Paporla`,
          description,
          images: ogImage ? [{ url: ogImage, alt: row.name }] : undefined,
        },
      }
    }
  } catch {
    // Si falla la DB, metadata genérica (no romper la página)
  }

  return FALLBACK_METADATA
}

export default function ShopDetailLayout({ children }: Props) {
  return <>{children}</>
}
