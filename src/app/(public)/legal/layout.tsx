import type { Metadata } from 'next'
import { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Información legal',
  description: 'Términos y condiciones, políticas de privacidad, cookies y bases legales de Paporla.',
  robots: { index: true, follow: true },
}

export default function LegalLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
