import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import ShopDetailClient from './ShopDetailClient'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ id: string }>
}

async function loadShop(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_public_shop', { p_shop_id: id })
  if (error || !data) return null
  return data
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const data = await loadShop(id)
  const row = (
    data && typeof data === 'object' && 'shop' in (data as object)
      ? (data as { shop: Record<string, unknown> }).shop
      : data
  ) as Record<string, unknown> | null

  if (!row) {
    return { title: 'Comercio no encontrado', description: 'Este comercio no está disponible.' }
  }

  const name = String(row.name ?? 'Comercio')
  const description = String(row.description ?? '').slice(0, 160) || `Descubre los packs de ${name} en Paporla.`

  return {
    title: `${name} | Paporla`,
    description,
  }
}

export default async function ShopDetailPage({ params }: Props) {
  const { id } = await params
  const data = await loadShop(id)
  if (!data) notFound()
  return <ShopDetailClient shopId={id} initialShop={data as Record<string, unknown>} />
}
