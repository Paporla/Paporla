import type { Metadata } from 'next'

/**
 * Título propio de /legal/cookies (SEO-1). Mismo patrón y política que el
 * layout de /legal/terminos: página cliente, layout de servidor que solo
 * envuelve, metadata plana sin canonical/OG (política de src/lib/seo.ts).
 * El título calca el H1 de la página.
 */
export const metadata: Metadata = {
  title: 'Política de Cookies',
  description: 'Qué cookies usa Paporla, para qué sirven y cómo gestionarlas desde tu navegador.',
}

export default function CookiesLayout({ children }: { children: React.ReactNode }) {
  return children
}
