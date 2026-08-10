import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Preguntas Frecuentes — Paporla',
  description:
    'Resuelve tus dudas sobre cómo funciona Paporla: reservas, pagos, recogida y más.',
  openGraph: {
    title: 'FAQ — Preguntas Frecuentes | Paporla',
    description: 'Todo lo que necesitas saber sobre Paporla: cómo reservar, pagar y recoger tus packs.',
  },
}

export default function FaqMetadataLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
