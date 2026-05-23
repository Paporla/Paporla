'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils/cn'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

interface AppMobileNavProps {
  items: NavItem[]
  layoutId?: string
}

export default function AppMobileNav({ items, layoutId = 'mobileNav' }: AppMobileNavProps) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-dark-card/90 backdrop-blur-xl border-t border-dark-border">
      <div className="flex items-center justify-around py-2 px-2">
        {items.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all relative',
                'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
              )}
            >
              {active && (
                <motion.div
                  layoutId={layoutId}
                  className="absolute inset-0 bg-primary/20 rounded-xl"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <Icon
                className={cn(
                  'w-5 h-5 relative z-10 transition-colors',
                  active ? 'text-primary' : 'dark:text-gray-500 text-gray-500',
                )}
              />
              <span
                className={cn(
                  'text-[10px] relative z-10 transition-colors',
                  active ? 'text-primary font-medium' : 'dark:text-gray-500 text-gray-500',
                )}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
