'use client'

import { Home, ShoppingBag, Store, User } from 'lucide-react'
import AppMobileNav from '@/components/layout/AppMobileNav'
import { useAuth } from '@/hooks/useAuth'

/**
 * L-66: barra inferior de la zona publica de exploracion. Hasta ahora
 * AppMobileNav solo se montaba en los layouts de (dashboard) y (business):
 * al tocar Packs o Comercios desde la app se salia del caparazon y la barra
 * desaparecia, y las paginas publicas parecian "web de escritorio" en el
 * movil. Esta barra da los mismos atajos a las cuatro paginas de exploracion
 * (listas y detalles); el cuarto atajo se adapta a la sesion.
 */
export default function PublicMobileNav() {
  const { user } = useAuth()
  const items = [
    { href: '/', label: 'Inicio', icon: Home },
    { href: '/packs', label: 'Packs', icon: ShoppingBag },
    { href: '/shops', label: 'Comercios', icon: Store },
    { href: user ? '/dashboard' : '/login', label: user ? 'Mi cuenta' : 'Entrar', icon: User },
  ]
  return <AppMobileNav items={items} layoutId="publicMobileNav" />
}
