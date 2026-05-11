'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import Button from '@/components/ui/Button'

interface MobileMenuProps {
  isOpen: boolean
  onClose: () => void
}

export default function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const { user, signOut } = useAuth()

  const getDashboardLink = () => {
    if (!user) return '/dashboard'
    switch (user.role) {
      case 'user': return '/dashboard'
      case 'comercio': return '/business'
      case 'admin':
      case 'super_admin': return '/admin'
      default: return '/dashboard'
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 z-50 md:hidden"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween' }}
            className="fixed right-0 top-0 bottom-0 w-64 bg-gray-900 shadow-xl z-50 md:hidden"
          >
            <div className="p-6">
              <button onClick={onClose} className="absolute top-4 right-4 text-gray-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              <nav className="mt-8 flex flex-col gap-4">
                <Link href="/packs" onClick={onClose} className="text-gray-300 hover:text-primary">
                  Ver Packs
                </Link>
                <Link href="/faq" onClick={onClose} className="text-gray-300 hover:text-primary">
                  FAQ
                </Link>
                <Link href="/about" onClick={onClose} className="text-gray-300 hover:text-primary">
                  Sobre Nosotros
                </Link>
                
                {user ? (
                  <>
                    <Link href={getDashboardLink()} onClick={onClose}>
                      <Button variant="outline" size="sm" className="w-full">
                        Mi Panel
                      </Button>
                    </Link>
                    <Button variant="primary" size="sm" onClick={() => { signOut(); onClose(); }}>
                      Cerrar Sesión
                    </Button>
                  </>
                ) : (
                  <>
                    <Link href="/login" onClick={onClose}>
                      <Button variant="outline" size="sm" className="w-full">
                        Iniciar Sesión
                      </Button>
                    </Link>
                    <Link href="/register" onClick={onClose}>
                      <Button variant="primary" size="sm" className="w-full">
                        Registrarse
                      </Button>
                    </Link>
                  </>
                )}
              </nav>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}