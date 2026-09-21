import type { Metadata } from 'next'
import { seo } from '@/lib/seo'

/**
 * /about es un componente de cliente ('use client') y Next ignora cualquier
 * metadata exportada desde un cliente. Este layout de servidor, que solo
 * envuelve, es la forma canónica de ponerle canonical y og:url a la ruta
 * (paso 44b).
 */
export const metadata: Metadata = seo('/about', {
  title: 'Quiénes Somos',
  description:
    'Conoce la misión de Paporla: rescatar comida en buen estado de comercios locales para tu mesa. Menos desperdicio, más comunidad.',
})

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children
}
