import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contacto — Paporla',
  description: 'Escríbenos. Estamos aquí para ayudarte con cualquier duda sobre Paporla.',
  openGraph: {
    title: 'Contacto | Paporla',
    description: 'Contáctanos para resolver tus dudas sobre la plataforma de rescate alimentario.',
  },
}

export default function ContactoMetadataLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
