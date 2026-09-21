import type { Metadata } from 'next'

/**
 * Título propio de /legal/terminos (SEO-1): sin este layout, la página hereda
 * "Información legal" del layout padre. La página es 'use client' y no puede
 * exportar metadata; el layout de servidor que solo envuelve es la forma
 * canónica (patrón de /shops y /about, paso 44b). Metadata plana a propósito:
 * las legales no llevan canonical/OG propios (política de src/lib/seo.ts).
 * El título calca el H1 de la página (título = H1, buena práctica SEO).
 */
export const metadata: Metadata = {
  title: 'Términos y Condiciones',
  description:
    'Términos y Condiciones de uso de Paporla para consumidores: reservas, recogida de packs y reembolsos en Chile.',
}

export default function TerminosLayout({ children }: { children: React.ReactNode }) {
  return children
}
