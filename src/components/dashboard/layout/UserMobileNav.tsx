'use client';

import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Calendar,
  Heart,
  ShoppingBag,
  Store,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Panel', icon: LayoutDashboard },
  { href: '/reservations', label: 'Reservas', icon: Calendar },
  { href: '/favorites', label: 'Favoritos', icon: Heart },
  { href: '/packs', label: 'Packs', icon: ShoppingBag },
  { href: '/shops', label: 'Comercios', icon: Store },
];

export default function UserMobileNav() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-dark-card/90 backdrop-blur-xl border-t border-dark-border">
      <div className="flex items-center justify-around py-2 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className="flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all relative"
            >
              {active && (
                <motion.div
                  layoutId="userMobileNav"
                  className="absolute inset-0 bg-primary/20 rounded-xl"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <Icon
                className={`w-5 h-5 relative z-10 transition-colors ${
                  active ? 'text-primary' : 'text-gray-500'
                }`}
              />
              <span
                className={`text-[10px] relative z-10 transition-colors ${
                  active ? 'text-primary font-medium' : 'text-gray-500'
                }`}
              >
                {item.label === 'Dashboard' ? 'Inicio' : item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}