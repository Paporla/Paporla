import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import PackDetailClient from './PackDetailClient'
import type { SerializedPack } from './PackDetailClient'
import { notFound } from 'next/navigation'
import { DEFAULT_MARKET } from '@/lib/constants/markets'

interface Props {
  params: Promise<{ id: string }>
}

async function loadPublicPack(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('search_available_packs', {
    p_market_id: DEFAULT_MARKET.id,
    p_locality_id: undefined,
    p_latitude: undefined,
    p_longitude: undefined,
    p_radius_meters: 10000,
    p_query: undefined,
    p_limit: 50,
  })

  if (error) return { supabase, row: null as Record<string, unknown> | null }

  const row = ((data ?? []) as Record<string, unknown>[]).find((item) => item.pack_id === id) ?? null
  return { supabase, row }
}

/**
 * Mapea una fila plana de `search_available_packs` (migración 0014:13) al
 * shape que pinta la página. Esa RPC solo devuelve packs activos, con stock,
 * ventana de recogida futura y de comercios verificados: por eso `verified`
 * es siempre true aquí (un pack de comercio no verificado jamás aparece).
 *
 * Los nombres de campo son los canónicos de la base (price_minor,
 * currency_code, pickup_start_at…), sin la capa heredada de "centavos".
 */
function toSerializedPack(row: Record<string, unknown>, imageUrl: string | null): SerializedPack {
  return {
    id: String(row.pack_id),
    title: String(row.title ?? ''),
    description: (row.description as string | null) ?? null,
    allergen_notice: (row.allergen_notice as string | null) ?? null,
    category: String(row.category ?? ''),
    price_minor: Number(row.price_minor ?? 0),
    original_price_minor: row.original_price_minor != null ? Number(row.original_price_minor) : null,
    currency_code: String(row.currency_code ?? 'CLP'),
    remaining_stock: Number(row.remaining_stock ?? 0),
    // NOT NULL en packs (0004) y garantizados por el WHERE del search.
    pickup_start_at: String(row.pickup_start_at ?? ''),
    pickup_end_at: String(row.pickup_end_at ?? ''),
    timezone: String(row.timezone ?? 'America/Santiago'),
    image_url: imageUrl,
    shop_id: String(row.shop_id),
    shop: {
      id: String(row.shop_id),
      name: String(row.shop_name ?? ''),
      description: null,
      address: (row.shop_address as string | null) ?? null,
      city: String(row.locality_name ?? ''),
      phone: null,
      logo_url: null,
      rating: row.shop_rating != null ? Number(row.shop_rating) : null,
      verified: true,
    },
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const { supabase, row } = await loadPublicPack(id)

  if (!row) {
    return {
      title: 'Pack no encontrado',
      description: 'El pack que buscas no esta disponible.',
    }
  }

  const imageUrl = row.image_path
    ? supabase.storage.from('pack-images').getPublicUrl(String(row.image_path)).data.publicUrl
    : null

  const title = String(row.title ?? 'Pack')
  const description = String(row.description ?? '').slice(0, 160) || `Pack sorpresa disponible - ${title}`

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Paporla`,
      description,
      images: imageUrl ? [{ url: imageUrl, width: 1200, height: 630, alt: title }] : [],
    },
    twitter: {
      title: `${title} | Paporla`,
      description,
      images: imageUrl ? [imageUrl] : [],
    },
  }
}

export const dynamic = 'force-dynamic'

export default async function PackDetailPage({ params }: Props) {
  const { id } = await params
  const { supabase, row } = await loadPublicPack(id)

  if (!row) {
    notFound()
  }

  const imageUrl = row.image_path
    ? supabase.storage.from('pack-images').getPublicUrl(String(row.image_path)).data.publicUrl
    : null

  const initialPack = toSerializedPack(row, imageUrl)
  const headersList = await headers()
  const nonce = headersList.get('x-nonce') ?? ''
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://paporla.com'
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: initialPack.title,
    description: initialPack.description ?? `Pack sorpresa de ${initialPack.shop.name}`,
    image: initialPack.image_url ?? undefined,
    offers: {
      '@type': 'Offer',
      price: String(Number(row.price_minor ?? 0)),
      priceCurrency: String(row.currency_code ?? 'CLP'),
      availability: initialPack.remaining_stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `${siteUrl}/packs/${id}`,
    },
  }

  return (
    <>
      <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PackDetailClient initialPack={initialPack} />
    </>
  )
}
