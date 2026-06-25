'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { LayoutDashboard, Users, Store, BarChart3, Bell } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useNotifications } from '@/hooks/useNotifications'
import AppSidebar from '@/components/layout/AppSidebar'

export default function AdminSidebar() {
  const router = useRouter()
  const { signOut, user } = useAuth()
  const { unreadCount } = useNotifications()

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/users', label: 'Usuarios', icon: Users },
    { href: '/admin/shops', label: 'Comercios', icon: Store },
    { href: '/admin/stats', label: 'Estadisticas', icon: BarChart3 },
  ]

  const bottomItems = [{ href: '/admin/notifications', label: 'Notificaciones', icon: Bell, badge: unreadCount }]

  const handleLogout = async () => {
    await signOut()
    router.push('/')
  }

  return (
    <AppSidebar items={navItems} bottomItems={bottomItems} onLogout={handleLogout}>
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
          <h1 className="font-bold dark:text-white text-gray-900 text-lg">Paporla</h1>
          <p className="text-[10px] dark:text-gray-500 text-gray-500">Panel de Administracion</p>
        </div>
      </div>

      {/* User info */}
      <div className="mx-4 mt-6 p-3 rounded-xl bg-primary/5 border border-primary/20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-primary text-sm font-bold">{user?.name?.charAt(0) || 'A'}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium dark:text-white text-gray-900 truncate">{user?.name ?? 'Admin'}</p>
            <p className="text-[10px] dark:text-gray-500 text-gray-500">{user?.email}</p>
          </div>
        </div>
      </div>
    </AppSidebar>
  )
}
