import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import PackDetailClient from './PackDetailClient'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ id: string }>
}

// Metadata dinamica generada desde el servidor (SEO real)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()

  const { data: pack } = await supabase
    .from('packs')
    .select('title, description, image_url')
    .eq('id', id)
    .eq('is_active', true)
    .is('deleted_at', null)
    .maybeSingle()

  if (!pack) {
    return {
      title: 'Pack no encontrado',
      description: 'El pack que buscas no esta disponible.',
    }
  }

  return {
    title: pack.title,
    description: pack.description?.slice(0, 160) || `Pack sorpresa disponible - ${pack.title}`,
    openGraph: {
      title: `${pack.title} | Paporla`,
      description: pack.description?.slice(0, 160) || 'Pack sorpresa de comida con descuento.',
      images: pack.image_url ? [{ url: pack.image_url, width: 1200, height: 630, alt: pack.title }] : [],
    },
    twitter: {
      title: `${pack.title} | Paporla`,
      description: pack.description?.slice(0, 160) || 'Pack sorpresa de comida con descuento.',
      images: pack.image_url ? [pack.image_url] : [],
    },
  }
}

export const dynamic = 'force-dynamic'

export default async function PackDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch inicial desde el servidor (SSR)
  const { data: initialPack } = await supabase
    .from('packs')
    .select('*, shop:shops (id, name, description, address, city, phone, logo_url, rating, verified)')
    .eq('id', id)
    .eq('is_active', true)
    .is('deleted_at', null)
    .maybeSingle()

  if (!initialPack) {
    notFound()
  }

  // JSON-LD para rich results de Google
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://paporla.com'
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: initialPack.title,
    description: initialPack.description || `Pack sorpresa de ${initialPack.shop?.name || 'comercio local'}`,
    image: initialPack.image_url || undefined,
    offers: {
      '@type': 'Offer',
      price: (initialPack.price_cents / 100).toFixed(2),
      priceCurrency: 'USD',
      availability: initialPack.remaining_stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `${siteUrl}/packs/${id}`,
    },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PackDetailClient initialPack={initialPack} packId={id} />
    </>
  )
}
