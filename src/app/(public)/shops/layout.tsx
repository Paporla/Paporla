import type { Metadata } from 'next'
import { seo } from '@/lib/seo'

/**
 * /shops es un componente de cliente ('use client') y Next ignora cualquier
 * metadata exportada desde un cliente. Este layout de servidor, que solo
 * envuelve, es la forma canónica de ponerle canonical y og:url a la ruta.
 * El detalle /shops/[id] pisa este canonical con el suyo propio.
 */
export const metadata: Metadata = seo('/shops', {
  title: 'Comercios Aliados',
  description:
    'Descubre panaderías, cafeterías, restaurantes y supermercados aliados de Paporla que rescatan su comida en buen estado para tu mesa.',
})

export default function ShopsLayout({ children }: { children: React.ReactNode }) {
  return children
}
