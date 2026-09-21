import type { Metadata } from 'next'

/**
 * Título propio de /legal/legal-bases (SEO-1). Mismo patrón y política que el
 * layout de /legal/terminos: página cliente, layout de servidor que solo
 * envuelve, metadata plana sin canonical/OG (política de src/lib/seo.ts).
 * El título calca el H1 de la página.
 */
export const metadata: Metadata = {
  title: 'Bases Legales',
  description:
    'Bases legales que regulan el servicio de Paporla en Chile: marco normativo aplicable al rescate alimentario.',
}

export default function LegalBasesLayout({ children }: { children: React.ReactNode }) {
  return children
}
