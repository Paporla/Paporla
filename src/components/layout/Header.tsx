'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/context/ThemeContext'
import { Menu, X } from 'lucide-react'
import AvatarMenu from './AvatarMenu'
import NotificationBell from '@/components/notifications/NotificationBell'
import ThemeToggle from './ThemeToggle'

export default function Header() {
  const pathname = usePathname()
  const { user, loading } = useAuth()
  const { theme } = useTheme()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const publicLinks = [
    { href: '/packs', label: 'Packs' },
    { href: '/shops', label: 'Comercios' },
    { href: '/about', label: 'Nosotros' },
    { href: '/faq', label: 'FAQ' },
  ]

  const navLinks = user ? publicLinks : publicLinks

  const isDark = theme === 'dark'

  if (!mounted || loading) {
    return (
      <nav
        className={`fixed top-0 left-0 right-0 z-[60] h-16 ${isDark ? 'bg-black/80 backdrop-blur-xl border-b border-gray-800' : 'bg-white/80 backdrop-blur-xl border-b border-gray-200'}`}
      />
    )
  }

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-[60] transition-all duration-300 ${isScrolled ? (isDark ? 'bg-black/80 backdrop-blur-xl border-b border-gray-800' : 'bg-white/80 backdrop-blur-xl border-b border-gray-200') : 'bg-transparent'}`}
    >
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
            <span
              className={`font-bold text-xl ${isDark ? 'text-white' : 'text-gray-900'}`}
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Paporla
            </span>
          </Link>

          {/* Enlaces desktop */}
          <div className="hidden md:flex items-center gap-6 lg:gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`${isDark ? 'text-gray-300 hover:text-primary' : 'text-gray-600 hover:text-primary'} transition-colors relative group ${pathname === link.href ? 'text-primary' : ''}`}
              >
                {link.label}
                <span
                  className={`absolute -bottom-1 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300 ${pathname === link.href ? 'w-full' : ''}`}
                />
              </Link>
            ))}
          </div>

          {/* Avatar / Autenticacion + Notificaciones */}
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
                Iniciar Sesion
              </Link>
            )}

            <ThemeToggle />

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`md:hidden p-2 rounded-lg ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}
              aria-label="Menu"
            >
              {isMenuOpen ? (
                <X className={`w-5 h-5 ${isDark ? 'text-white' : 'text-gray-900'}`} />
              ) : (
                <Menu className={`w-5 h-5 ${isDark ? 'text-white' : 'text-gray-900'}`} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Menu movil */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`md:hidden ${isDark ? 'bg-black/95 backdrop-blur-xl border-t border-gray-800' : 'bg-white/95 backdrop-blur-xl border-t border-gray-200'}`}
          >
            <div className="px-4 py-4 flex flex-col gap-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`px-4 py-2 ${isDark ? 'text-gray-300 hover:text-primary' : 'text-gray-600 hover:text-primary'} rounded-lg ${pathname === link.href ? 'text-primary bg-primary/10' : ''}`}
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
  )
}
