'use client'

import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Home, Search, Calendar, Heart, User } from 'lucide-react'

const navItems = [
  { id: 'home', label: 'Inicio', icon: Home, href: '/dashboard' },
  { id: 'search', label: 'Buscar', icon: Search, href: '/packs' },
  { id: 'reservations', label: 'Reservas', icon: Calendar, href: '/reservations' },
  { id: 'favorites', label: 'Favoritos', icon: Heart, href: '/favorites' },
  { id: 'profile', label: 'Perfil', icon: User, href: '/profile' },
]

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(href)
  }

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-xl border-t border-white/10">
      <div className="flex items-center justify-around px-4 py-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)

          return (
            <button
              key={item.id}
              onClick={() => router.push(item.href)}
              className="relative flex flex-col items-center gap-1 py-1 px-3"
            >
              {active && (
                <motion.div
                  layoutId="bottomNav"
                  className="absolute inset-0 bg-primary/20 rounded-full"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <Icon
                className={`w-5 h-5 relative z-10 transition-colors ${active ? 'text-primary' : 'text-gray-500'}`}
              />
              <span
                className={`text-[10px] relative z-10 transition-colors ${
                  active ? 'text-primary font-medium' : 'text-gray-500'
                }`}
              >
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
