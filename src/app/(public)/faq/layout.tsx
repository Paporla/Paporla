import type { Metadata } from 'next'
import { seo } from '@/lib/seo'

/**
 * /faq es un componente de cliente ('use client') y Next ignora cualquier
 * metadata exportada desde un cliente. Este layout de servidor, que solo
 * envuelve, es la forma canónica de ponerle canonical y og:url a la ruta
 * (paso 44b).
 */
export const metadata: Metadata = seo('/faq')

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return children
}
