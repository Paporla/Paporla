import type { Metadata } from 'next'
import { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'

interface Props {
  children: ReactNode
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params

  try {
    const supabase = await createClient()

    const { data: shop } = await supabase
      .from('shops')
      .select('name, description, city, logo_url')
      .eq('id', id)
      .maybeSingle()

    if (shop) {
      return {
        title: shop.name,
        description:
          shop.description ?? `Visita ${shop.name} en ${shop.city ?? 'tu ciudad'} y descubre sus packs sorpresa.`,
        openGraph: {
          title: `${shop.name} | Paporla`,
          description: shop.description ?? `Visita ${shop.name} en ${shop.city ?? 'tu ciudad'}`,
          images: shop.logo_url ? [{ url: shop.logo_url }] : undefined,
        },
      }
    }
  } catch {
    // Si falla la DB, metadata generica
  }

  return {
    title: 'Comercio',
    description: 'Conoce este comercio asociado en Paporla.',
  }
}

export default function ShopDetailLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
