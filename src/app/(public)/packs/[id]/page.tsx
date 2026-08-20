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

function toSerializedPack(row: Record<string, unknown>, imageUrl: string | null): SerializedPack {
  return {
    id: String(row.pack_id),
    title: String(row.title ?? ''),
    description: (row.description as string | null) ?? null,
    price_cents: Number(row.price_minor ?? 0),
    original_price_cents: row.original_price_minor != null ? Number(row.original_price_minor) : null,
    total_stock: Number(row.remaining_stock ?? 0),
    remaining_stock: Number(row.remaining_stock ?? 0),
    pickup_date: null,
    pickup_start_time: null,
    pickup_end_time: null,
    ends_at: (row.pickup_end_at as string | null) ?? null,
    image_url: imageUrl,
    is_active: true,
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
      <PackDetailClient initialPack={initialPack} packId={id} />
    </>
  )
}
