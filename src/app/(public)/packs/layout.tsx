import type { Metadata } from 'next'
import { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Packs sorpresa',
  description: 'Descubre packs sorpresa de comida con hasta 70% de descuento en comercios locales. Rescata alimentos, ahorra dinero y ayuda al planeta.',
  openGraph: {
    title: 'Packs sorpresa | Paporla',
    description: 'Descubre packs sorpresa de comida con hasta 70% de descuento en comercios locales.',
  },
}

export default function PacksLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
