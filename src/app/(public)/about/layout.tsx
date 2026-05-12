import type { Metadata } from 'next'
import { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Sobre nosotros',
  description: 'Conoce la historia de Paporla, nuestra misión de reducir el desperdicio de alimentos y cómo estamos construyendo una comunidad de rescate alimentario en Venezuela.',
  openGraph: {
    title: 'Sobre nosotros | Paporla',
    description: 'Conoce la historia de Paporla y nuestra misión de reducir el desperdicio de alimentos.',
  },
}

export default function AboutLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
