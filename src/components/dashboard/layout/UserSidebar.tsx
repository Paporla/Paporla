'use client';

import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  LayoutDashboard,
  Calendar,
  Heart,
  LogOut,
  HelpCircle,
  Bell,
  ShoppingBag,
  Store,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';

interface NavItem {
  href: string;
  label: string;
  icon: any;
  badge?: number;
}

export default function UserSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut, user } = useAuth();
  const { unreadCount } = useNotifications();

  const navItems: NavItem[] = [
    { href: '/dashboard', label: 'Panel', icon: LayoutDashboard },
    { href: '/reservations', label: 'Mis Reservas', icon: Calendar },
    { href: '/favorites', label: 'Favoritos', icon: Heart },
  ];

  const exploreItems: NavItem[] = [
    { href: '/packs', label: 'Explorar Packs', icon: ShoppingBag },
    { href: '/shops', label: 'Explorar Comercios', icon: Store },
  ];

  const bottomItems: NavItem[] = [
    { href: '/notifications', label: 'Notificaciones', icon: Bell, badge: unreadCount },
    { href: '/faq', label: 'FAQ', icon: HelpCircle },
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-72 bg-dark-card/80 backdrop-blur-xl border-r border-dark-border z-30 hidden lg:flex lg:flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-dark-border">
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
          <p className="text-[10px] text-gray-500">Panel de Usuario</p>
        </div>
      </div>

      {/* User info */}
      <div className="mx-4 mt-6 p-3 rounded-xl bg-primary/5 border border-primary/20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-primary text-sm font-bold">
              {user?.name?.charAt(0) || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user?.name || 'Usuario'}
            </p>
            <p className="text-[10px] text-gray-500">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                transition-all duration-200 group
                ${active
                  ? 'bg-primary/10 text-primary border-l-2 border-primary'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }
              `}
            >
              <Icon className={`w-5 h-5 ${active ? 'text-primary' : 'text-gray-500 group-hover:text-white'}`} />
              <span className="flex-1 text-left">{item.label}</span>
            </button>
          );
        })}

        {/* Separador */}
        <div className="my-3 px-3">
          <div className="h-px bg-dark-border" />
        </div>

        {/* Sección de exploración */}
        {exploreItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                transition-all duration-200 group
                ${active
                  ? 'bg-primary/10 text-primary border-l-2 border-primary'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }
              `}
            >
              <Icon className="w-5 h-5" />
              <span className="flex-1 text-left">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-3 py-4 border-t border-dark-border space-y-1">
        {bottomItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                transition-all duration-200 group
                ${active
                  ? 'bg-primary/10 text-primary'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }
              `}
            >
              <Icon className="w-5 h-5" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && item.badge > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </button>
          );
        })}

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all duration-200 group"
        >
          <LogOut className="w-5 h-5" />
          <span className="flex-1 text-left">Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}