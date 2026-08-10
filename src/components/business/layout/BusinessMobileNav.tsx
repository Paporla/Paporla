'use client'

import { LayoutDashboard, Package, Calendar, BarChart3, Store } from 'lucide-react'
import AppMobileNav from '@/components/layout/AppMobileNav'

const navItems = [
  { href: '/business', label: 'Inicio', icon: LayoutDashboard },
  { href: '/business/packs', label: 'Packs', icon: Package },
  { href: '/business/reservations', label: 'Reservas', icon: Calendar },
  { href: '/business/analytics', label: 'Stats', icon: BarChart3 },
  { href: '/business/profile', label: 'Perfil', icon: Store },
]

export default function BusinessMobileNav() {
  return <AppMobileNav items={navItems} layoutId="mobileNav" />
}
