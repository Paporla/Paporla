import type { Metadata } from 'next'
import PacksPageClient from './PacksPageClient'
import { seo } from '@/lib/seo'

export const metadata: Metadata = seo('/packs', {
  title: 'Packs Disponibles',
  description: 'Explora packs sorpresa de comida con descuento. Rescata alimentos y ayuda a reducir el desperdicio.',
})

export const dynamic = 'force-dynamic'

export default function PacksPage() {
  return <PacksPageClient />
}
