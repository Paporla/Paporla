import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sobre Paporla — Rescate Alimentario',
  description:
    'Conoce nuestra misión, visión y valores. Transformamos el desperdicio alimentario en oportunidades para todos.',
  openGraph: {
    title: 'Sobre Paporla — Nuestra misión de rescate alimentario',
    description: 'Reducimos el desperdicio conectando comercios con personas. Conoce nuestra historia.',
  },
}

export default function AboutMetadataLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
