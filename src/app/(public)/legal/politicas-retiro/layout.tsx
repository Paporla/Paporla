import type { Metadata } from 'next'

/**
 * Título propio de /legal/politicas-retiro (SEO-1). Mismo patrón y política
 * que el layout de /legal/terminos: página cliente, layout de servidor que
 * solo envuelve, metadata plana sin canonical/OG (política de src/lib/seo.ts).
 * El título calca el H1 de la página.
 */
export const metadata: Metadata = {
  title: 'Políticas de Retiro y Cancelación',
  description:
    'Cómo y cuándo retirar tu pack en el comercio: ventanas de recogida, código de retiro y qué pasa si cancelas o no llegas.',
}

export default function PoliticasRetiroLayout({ children }: { children: React.ReactNode }) {
  return children
}
