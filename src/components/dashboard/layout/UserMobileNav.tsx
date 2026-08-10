'use client'

import { LayoutDashboard, Calendar, Heart, ShoppingBag, Store } from 'lucide-react'
import AppMobileNav from '@/components/layout/AppMobileNav'

const navItems = [
  { href: '/dashboard', label: 'Panel', icon: LayoutDashboard },
  { href: '/reservations', label: 'Reservas', icon: Calendar },
  { href: '/favorites', label: 'Favoritos', icon: Heart },
  { href: '/packs', label: 'Packs', icon: ShoppingBag },
  { href: '/shops', label: 'Comercios', icon: Store },
]

export default function UserMobileNav() {
  return <AppMobileNav items={navItems} layoutId="userMobileNav" />
}
