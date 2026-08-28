import type { Metadata } from 'next'
import { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import { formatChilePesos } from '@/lib/utils/formatPrice'

interface Props {
  children: ReactNode
  params: Promise<{ id: string }>
}

interface MetadataProps {
  params: Promise<{ id: string }>
}

const FALLBACK_METADATA: Metadata = {
  title: 'Pack',
  description: 'Descubre este pack sorpresa en Paporla.',
}

/**
 * Fase 8: los metadatos (title/description/OG) salen de la RPC canónica
 * get_pack_public (0029+0030, GRANT anon) en vez del .from('packs') legacy,
 * que el esquema 0012 niega (42501): por eso compartir un pack en WhatsApp no
 * mostraba ni título ni foto. La imagen OG se construye con el bucket público
 * pack-images (mismo patrón que la página del pack).
 */
export async function generateMetadata({ params }: MetadataProps): Promise<Metadata> {
  const { id } = await params

  try {
    const supabase = await createClient()

    const { data: pack } = await supabase.rpc('get_pack_public', { p_pack_id: id })

    const row = (Array.isArray(pack) ? pack[0] : pack) as
      | {
          title: string
          description: string | null
          price_minor: number
          currency_code: string
          image_path: string | null
        }
      | undefined

    if (row) {
      let ogImage: string | undefined
      if (row.image_path) {
        const { data } = supabase.storage.from('pack-images').getPublicUrl(row.image_path)
        ogImage = data.publicUrl || undefined
      }

      const description =
        row.description ??
        `Pack sorpresa por ${formatChilePesos(row.price_minor)} en Paporla. Rescata comida, ahorra dinero.`

      return {
        title: row.title,
        description,
        openGraph: {
          type: 'website',
          title: `${row.title} | Paporla`,
          description,
          images: ogImage ? [{ url: ogImage, alt: row.title }] : undefined,
        },
        twitter: {
          card: 'summary_large_image',
          title: `${row.title} | Paporla`,
          description,
        },
      }
    }
  } catch {
    // Si falla la DB, metadata genérica (no romper la página)
  }

  return FALLBACK_METADATA
}

export default function PackDetailLayout({ children }: Props) {
  return <>{children}</>
}
