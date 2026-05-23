'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { LayoutDashboard, Users, Store, BarChart3 } from 'lucide-react'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Usuarios', icon: Users },
  { href: '/admin/shops', label: 'Comercios', icon: Store },
  { href: '/admin/stats', label: 'Estadisticas', icon: BarChart3 },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-72 dark:bg-dark-card/80 bg-white/80 backdrop-blur-xl border-r dark:border-dark-border border-gray-200 z-30 hidden lg:flex lg:flex-col">
      <div className="px-6 py-5 border-b dark:border-dark-border border-gray-200">
        <h1 className="font-bold dark:text-white text-gray-900 text-lg">Admin</h1>
        <p className="text-[10px] dark:text-gray-500 text-gray-500">Panel de Administracion</p>
      </div>
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto" aria-label="Navegacion principal">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group',
                'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                active
                  ? 'bg-primary/10 text-primary border-l-2 border-primary'
                  : 'dark:text-gray-400 text-gray-700 dark:hover:bg-white/5 hover:bg-gray-100 dark:hover:text-white hover:text-gray-900',
              )}
            >
              <Icon
                className={cn(
                  'w-5 h-5',
                  active
                    ? 'text-primary'
                    : 'dark:text-gray-500 text-gray-500 group-hover:dark:text-white group-hover:text-gray-900',
                )}
              />
              <span className="flex-1 text-left">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
