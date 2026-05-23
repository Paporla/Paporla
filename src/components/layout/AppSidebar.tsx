'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { LogOut } from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
}

interface AppSidebarProps {
  items: NavItem[]
  exploreItems?: NavItem[]
  bottomItems?: NavItem[]
  onLogout?: () => void
  children?: React.ReactNode
}

export default function AppSidebar({ items, exploreItems, bottomItems, onLogout, children }: AppSidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-72 dark:bg-dark-card/80 bg-white/80 backdrop-blur-xl border-r dark:border-dark-border border-gray-200 z-30 hidden lg:flex lg:flex-col">
      {children}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto" aria-label="Navegación principal">
        {items.map((item) => {
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
              {item.badge && item.badge > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </Link>
          )
        })}
        {exploreItems && exploreItems.length > 0 && (
          <>
            <div className="my-3 px-3">
              <div className="h-px dark:bg-dark-border bg-gray-200" />
            </div>
            {exploreItems.map((item) => {
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
                  <Icon className="w-5 h-5" />
                  <span className="flex-1 text-left">{item.label}</span>
                </Link>
              )
            })}
          </>
        )}
      </nav>
      {bottomItems && bottomItems.length > 0 && (
        <div className="px-3 py-4 border-t dark:border-dark-border border-gray-200 space-y-1">
          {bottomItems.map((item) => {
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
                    ? 'bg-primary/10 text-primary'
                    : 'dark:text-gray-400 text-gray-700 dark:hover:bg-white/5 hover:bg-gray-100 dark:hover:text-white hover:text-gray-900',
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && item.badge > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </Link>
            )
          })}
          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all duration-200 group focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <LogOut className="w-5 h-5" />
              <span className="flex-1 text-left">Cerrar sesion</span>
            </button>
          )}
        </div>
      )}
    </aside>
  )
}
