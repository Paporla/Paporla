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

    const { data: pack } = await supabase
      .from('packs')
      .select('title, description, price_cents')
      .eq('id', id)
      .maybeSingle()

    if (pack) {
      return {
        title: pack.title,
        description:
          pack.description ??
          `Pack sorpresa desde $${(pack.price_cents / 100).toFixed(2)} - Rescata comida, ahorra dinero.`,
        openGraph: {
          title: `${pack.title} | Paporla`,
          description: pack.description ?? `Pack sorpresa desde $${(pack.price_cents / 100).toFixed(2)}`,
        },
      }
    }
  } catch {
    // Si falla la DB, metadata generica
  }

  return {
    title: 'Pack',
    description: 'Descubre este pack sorpresa en Paporla.',
  }
}

export default function PackDetailLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
