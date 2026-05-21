'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { 
  Package, Heart, Bell, HelpCircle, Info, LogOut, ChevronRight 
} from 'lucide-react';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useState } from 'react';

interface MenuItem {
  icon: any;
  label: string;
  href: string;
  value?: string;
}

const menuSections = [
  {
    title: 'Mis datos',
    items: [
      { icon: Package, label: 'Mis reservas', href: '/reservations', value: 'Ver todas' },
      { icon: Heart, label: 'Favoritos', href: '/favorites', value: 'Ver guardados' },
      { icon: Bell, label: 'Notificaciones', href: '/notifications', value: 'Configurar' },
    ] as MenuItem[],
  },
  {
    title: 'General',
    items: [
      { icon: HelpCircle, label: 'Centro de ayuda', href: '/faq' },
      { icon: Info, label: 'Sobre Paporla', href: '/about' },
    ] as MenuItem[],
  },
];

export default function ProfileMenu() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <>
      {menuSections.map((section, si) => (
        <div key={si} className="space-y-2">
          {section.title && (
            <p className="text-xs font-bold dark:text-gray-500 text-gray-400 uppercase tracking-wider px-1 mb-2">
              {section.title}
            </p>
          )}
          <div className="dark:bg-dark-card bg-white dark:border-dark-border border-gray-200 rounded-2xl overflow-hidden divide-y dark:divide-dark-border divide-gray-200">
            {section.items.map((item, ii) => (
              <Link
                key={ii}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3.5 hover:dark:bg-white/[0.02] hover:bg-gray-50 transition-colors group"
              >
                <div className="w-9 h-9 rounded-xl dark:bg-dark-muted bg-gray-100 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <item.icon className="w-4 h-4 dark:text-gray-400 text-gray-600 group-hover:text-primary transition-colors" />
                </div>
                <span className="flex-1 text-sm dark:text-white text-gray-900">{item.label}</span>
                {item.value && (
                  <span className="text-xs dark:text-gray-500 text-gray-400">{item.value}</span>
                )}
                <ChevronRight className="w-4 h-4 dark:text-gray-600 text-gray-400 group-hover:dark:text-gray-400 group-hover:text-gray-600 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      ))}

      {/* Boton de cerrar sesion */}
      <button
        onClick={() => setIsLogoutModalOpen(true)}
        className="w-full flex items-center gap-3 px-4 py-3.5 dark:bg-dark-card bg-white dark:border-dark-border border-gray-200 rounded-2xl hover:border-red-500/20 group transition-all"
      >
        <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center">
          <LogOut className="w-4 h-4 text-red-400" />
        </div>
        <span className="text-sm text-red-400 font-medium">Cerrar sesion</span>
      </button>

      {/* Modal de confirmacion */}
      <ConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogout}
        title="Cerrar sesion"
        message="Estas seguro de que quieres cerrar sesion?"
        confirmText="Si, cerrar sesion"
        cancelText="Cancelar"
      />
    </>
  );
}
