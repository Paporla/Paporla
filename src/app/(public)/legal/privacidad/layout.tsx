import type { Metadata } from 'next'

/**
 * Título propio de /legal/privacidad (SEO-1). Mismo patrón y política que el
 * layout de /legal/terminos: página cliente, layout de servidor que solo
 * envuelve, metadata plana sin canonical/OG (política de src/lib/seo.ts).
 * El título calca el H1 de la página.
 */
export const metadata: Metadata = {
  title: 'Política de Privacidad',
  description:
    'Cómo Paporla trata tus datos personales: finalidades, plazos de conservación, transferencias y tus derechos ARCO-P.',
}

export default function PrivacidadLayout({ children }: { children: React.ReactNode }) {
  return children
}
