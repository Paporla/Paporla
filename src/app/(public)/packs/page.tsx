import type { Metadata } from 'next'
import PacksPageClient from './PacksPageClient'

export const metadata: Metadata = {
  title: 'Packs Disponibles',
  description:
    'Explora packs sorpresa de comida con descuento en Caracas. Rescata alimentos y ayuda a reducir el desperdicio.',
}

export const dynamic = 'force-dynamic'

export default function PacksPage() {
  return <PacksPageClient />
}
