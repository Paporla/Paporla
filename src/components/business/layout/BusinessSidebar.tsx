'use client';

import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  LayoutDashboard,
  Package,
  Calendar,
  BarChart3,
  Store,
  LogOut,
  HelpCircle,
  Bell,
  ShoppingBag,
  Compass,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';

interface NavItem {
  href: string;
  label: string;
  icon: any;
  badge?: number;
}

export default function BusinessSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut, user } = useAuth();
  const { unreadCount } = useNotifications();

  const navItems: NavItem[] = [
    { href: '/business', label: 'Panel', icon: LayoutDashboard },
    { href: '/business/packs', label: 'Mis Packs', icon: Package },
    { href: '/business/reservations', label: 'Mis Reservas', icon: Calendar },
    { href: '/business/analytics', label: 'Estadisticas', icon: BarChart3 },
    { href: '/business/profile', label: 'Mi Comercio', icon: Store },
  ];

  const exploreItems: NavItem[] = [
    { href: '/packs', label: 'Explorar Packs', icon: ShoppingBag },
    { href: '/shops', label: 'Explorar Comercios', icon: Compass },
  ];

  const bottomItems: NavItem[] = [
    { href: '/business/notifications', label: 'Notificaciones', icon: Bell, badge: unreadCount },
    { href: '/faq', label: 'FAQ', icon: HelpCircle },
  ];

  const isActive = (href: string) => {
    if (href === '/business') return pathname === '/business';
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-72 dark:bg-dark-card/80 bg-white/80 backdrop-blur-xl border-r dark:border-dark-border border-gray-200 z-30 hidden lg:flex lg:flex-col">
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
          <p className="text-[10px] dark:text-gray-500 text-gray-400">Panel de Comercio</p>
        </div>
      </div>

      {/* Store info */}
      <div className="mx-4 mt-6 p-3 rounded-xl bg-primary/5 border border-primary/20">
        <div className="flex items-center gap-2">
          <Store className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium dark:text-white text-gray-900 truncate">
            {user?.name || 'Mi Comercio'}
          </span>
        </div>
        <div className="flex items-center gap-1 mt-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
          <span className="text-[10px] dark:text-gray-500 text-gray-400">Activo</span>
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
                  : 'dark:text-gray-400 text-gray-600 dark:hover:bg-white/5 hover:bg-gray-50 dark:hover:text-white hover:text-gray-900'
                }
              `}
            >
              <Icon className={`w-5 h-5 ${active ? 'text-primary' : 'dark:text-gray-500 text-gray-400 group-hover:dark:text-white group-hover:text-gray-900'}`} />
              <span className="flex-1 text-left">{item.label}</span>
            </button>
          );
        })}

        {/* Separador */}
        <div className="my-3 px-3">
          <div className="h-px dark:bg-dark-border bg-gray-200" />
        </div>

        {/* Seccion de exploracion */}
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
                  : 'dark:text-gray-400 text-gray-600 dark:hover:bg-white/5 hover:bg-gray-50 dark:hover:text-white hover:text-gray-900'
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
      <div className="px-3 py-4 border-t dark:border-dark-border border-gray-200 space-y-1">
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
                  : 'dark:text-gray-400 text-gray-600 dark:hover:bg-white/5 hover:bg-gray-50 dark:hover:text-white hover:text-gray-900'
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
          <span className="flex-1 text-left">Cerrar sesion</span>
        </button>
      </div>
    </aside>
  );
}
