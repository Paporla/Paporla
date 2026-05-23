import type { Metadata } from 'next'
import { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Preguntas frecuentes',
  description:
    'Resuelve tus dudas sobre cómo funciona Paporla: cómo reservar, recoger packs, cancelaciones, pagos y más.',
  openGraph: {
    title: 'Preguntas frecuentes | Paporla',
    description: 'Resuelve tus dudas sobre cómo funciona Paporla.',
  },
}

export default function FaqLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
