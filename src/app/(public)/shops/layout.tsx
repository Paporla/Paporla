import type { Metadata } from 'next'
import { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Comercios asociados',
  description:
    'Conoce los comercios locales que se unen al rescate alimentario. Descubre dónde encontrar los mejores packs sorpresa cerca de ti.',
  openGraph: {
    title: 'Comercios asociados | Paporla',
    description: 'Conoce los comercios locales que se unen al rescate alimentario.',
  },
}

export default function ShopsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
