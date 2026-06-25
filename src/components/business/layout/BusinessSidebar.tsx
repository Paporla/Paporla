'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  Calendar,
  BarChart3,
  Store,
  HelpCircle,
  Bell,
  ShoppingBag,
  Compass,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useNotifications } from '@/hooks/useNotifications'
import AppSidebar from '@/components/layout/AppSidebar'

export default function BusinessSidebar() {
  const router = useRouter()
  const { signOut, user } = useAuth()
  const { unreadCount } = useNotifications()

  const navItems = [
    { href: '/business', label: 'Panel', icon: LayoutDashboard },
    { href: '/business/packs', label: 'Mis Packs', icon: Package },
    { href: '/business/reservations', label: 'Mis Reservas', icon: Calendar },
    { href: '/business/analytics', label: 'Estadisticas', icon: BarChart3 },
    { href: '/business/profile', label: 'Mi Comercio', icon: Store },
  ]

  const exploreItems = [
    { href: '/packs', label: 'Explorar Packs', icon: ShoppingBag },
    { href: '/shops', label: 'Explorar Comercios', icon: Compass },
  ]

  const bottomItems = [
    { href: '/business/notifications', label: 'Notificaciones', icon: Bell, badge: unreadCount },
    { href: '/faq', label: 'FAQ', icon: HelpCircle },
  ]

  const handleLogout = async () => {
    await signOut()
    router.push('/')
  }

  return (
    <AppSidebar items={navItems} exploreItems={exploreItems} bottomItems={bottomItems} onLogout={handleLogout}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b dark:border-dark-border border-gray-200">
        <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
          <Image
            src="/images/logo-transparent.png"
            alt="Paporla"
            width={36}
            height={36}
            className="w-9 h-9 object-contain"
          />
        </div>
        <div>
          <h1 className="font-bold text-white text-lg">Paporla</h1>
          <p className="text-[10px] text-gray-500">Panel de Comercio</p>
        </div>
      </div>

      {/* Store info */}
      <div className="mx-4 mt-6 p-3 rounded-xl bg-primary/5 border border-primary/20">
        <div className="flex items-center gap-2">
          <Store className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-white truncate">{user?.name ?? 'Mi Comercio'}</span>
        </div>
        <div className="flex items-center gap-1 mt-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
          <span className="text-[10px] text-gray-500">Activo</span>
        </div>
      </div>
    </AppSidebar>
  )
}
