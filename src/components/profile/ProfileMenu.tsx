'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { 
  Package, Heart, Bell, User, CreditCard, MapPin, 
  Shield, Settings, HelpCircle, Info, LogOut, ChevronRight 
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
      { icon: Package, label: 'Mis reservas', href: '/dashboard/reservations', value: 'Ver todas' },
      { icon: Heart, label: 'Favoritos', href: '/dashboard/favorites', value: 'Ver guardados' },
      { icon: Bell, label: 'Notificaciones', href: '/dashboard/notifications', value: 'Configurar' },
    ] as MenuItem[],
  },
  {
    title: 'Cuenta',
    items: [
      { icon: User, label: 'Editar perfil', href: '/profile/edit' },
      { icon: CreditCard, label: 'Métodos de pago', href: '/profile/payment-methods' },
      { icon: MapPin, label: 'Direcciones', href: '/profile/addresses' },
      { icon: Shield, label: 'Seguridad', href: '/profile/security' },
    ] as MenuItem[],
  },
  {
    title: 'General',
    items: [
      { icon: Settings, label: 'Configuración', href: '/profile/settings' },
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
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1 mb-2">
              {section.title}
            </p>
          )}
          <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden divide-y divide-dark-border">
            {section.items.map((item, ii) => (
              <Link
                key={ii}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.02] transition-colors group"
              >
                <div className="w-9 h-9 rounded-xl bg-dark-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <item.icon className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />
                </div>
                <span className="flex-1 text-sm text-white">{item.label}</span>
                {item.value && (
                  <span className="text-xs text-gray-500">{item.value}</span>
                )}
                <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      ))}

      {/* Botón de cerrar sesión */}
      <button
        onClick={() => setIsLogoutModalOpen(true)}
        className="w-full flex items-center gap-3 px-4 py-3.5 bg-dark-card border border-dark-border rounded-2xl hover:border-red-500/20 group transition-all"
      >
        <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center">
          <LogOut className="w-4 h-4 text-red-400" />
        </div>
        <span className="text-sm text-red-400 font-medium">Cerrar sesión</span>
      </button>

      {/* Modal de confirmación */}
      <ConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogout}
        title="Cerrar sesión"
        message="¿Estás seguro de que quieres cerrar sesión?"
        confirmText="Sí, cerrar sesión"
        cancelText="Cancelar"
      />
    </>
  );
}