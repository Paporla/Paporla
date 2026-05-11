'use client';

import Image from 'next/image'
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Menu, X } from 'lucide-react';
import AvatarMenu from './AvatarMenu';
import NotificationBell from '@/components/notifications/NotificationBell';

export default function Header() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Links para usuarios NO logueados
  const publicLinks = [
    { href: '/packs', label: 'Packs' },
    { href: '/shops', label: 'Comercios' },
    { href: '/about', label: 'Nosotros' },
    { href: '/faq', label: 'FAQ' },
  ];

  const navLinks = user ? publicLinks : publicLinks;

  if (!mounted || loading) {
    return (
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-primary/20 h-16" />
    );
  }

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-black/80 backdrop-blur-xl border-b border-primary/20' : 'bg-transparent'}`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group" aria-label="Inicio">
            <Image
              src="/images/logo-transparent.png"
              alt="Paporla"
              width={32}
              height={32}
              className="w-8 h-8 object-contain group-hover:scale-105 transition-transform duration-300"
            />
            <span className="font-bold text-xl text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Paporla
            </span>
          </Link>

          {/* Enlaces desktop */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-gray-300 hover:text-primary transition-colors relative group ${pathname === link.href ? 'text-primary' : ''}`}
              >
                {link.label}
                <span className={`absolute -bottom-1 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300 ${pathname === link.href ? 'w-full' : ''}`} />
              </Link>
            ))}
          </div>

          {/* Avatar / Autenticación + Notificaciones */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <NotificationBell />
                <AvatarMenu />
              </>
            ) : (
              <Link
                href="/login"
                className="px-5 py-2 rounded-full bg-primary text-black font-medium hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
              >
                Iniciar Sesión
              </Link>
            )}

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-lg bg-white/5"
              aria-label="Menú"
            >
              {isMenuOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
            </button>
          </div>
        </div>
      </div>

      {/* Menú móvil */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-black/95 backdrop-blur-xl border-t border-primary/20"
          >
            <div className="px-4 py-4 flex flex-col gap-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`px-4 py-2 text-gray-300 hover:text-primary rounded-lg ${pathname === link.href ? 'text-primary bg-primary/10' : ''}`}
                >
                  {link.label}
                </Link>
              ))}

              {!user && (
                <Link
                  href="/register"
                  className="px-4 py-2 bg-primary text-black rounded-lg text-center font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Registrarse
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}