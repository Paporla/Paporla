import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import ShopDetailClient from './ShopDetailClient'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()

  const { data: shop } = await supabase
    .from('shops')
    .select('name, description, logo_url, city')
    .eq('id', id)
    .maybeSingle()

  if (!shop) {
    return { title: 'Comercio no encontrado', description: 'Este comercio no está disponible.' }
  }

  const description = shop.description?.slice(0, 160) || `Descubre los packs de ${shop.name} en ${shop.city || 'Paporla'}.`

  return {
    title: `${shop.name} | Paporla`,
    description,
    openGraph: {
      title: `${shop.name} | Paporla`,
      description,
      images: shop.logo_url ? [{ url: shop.logo_url, width: 512, height: 512, alt: shop.name }] : [],
    },
    twitter: {
      title: `${shop.name} | Paporla`,
      description,
      images: shop.logo_url ? [shop.logo_url] : [],
    },
  }
}

export default async function ShopDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: shop } = await supabase
    .from('shops')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!shop) notFound()

  return <ShopDetailClient shopId={id} initialShop={shop} />
}
