'use client'

import Image from 'next/image'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { UserCircle, LogOut, LayoutDashboard } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function AvatarMenu() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getInitials = () => {
    if (!user?.name) return 'U'
    return user.name.charAt(0).toUpperCase()
  }

  const getPanelRoute = () => {
    const role = user?.role
    if (role === 'comercio') return '/business'
    if (role === 'admin' || role === 'super_admin') return '/admin'
    return '/dashboard'
  }

  // NOMBRE DEL ROL PARA MOSTRAR
  const getRoleName = () => {
    const role = user?.role
    if (role === 'super_admin') return 'Super Admin'
    if (role === 'admin') return 'Administrador'
    if (role === 'comercio') return 'Comercio'
    return 'Usuario'
  }

  return (
    <div className="flex items-center gap-3">
      {/* Boton Panel - usa button + router para navegacion controlada */}
      <button
        onClick={() => {
          setIsOpen(false)
          const route = getPanelRoute()
          router.replace(route)
        }}
        className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-all duration-300"
      >
        <LayoutDashboard className="w-4 h-4" />
        <span className="text-sm font-medium">Panel</span>
      </button>

      <button
        onClick={() => {
          setIsOpen(false)
          const route = getPanelRoute()
          router.replace(route)
        }}
        className="flex sm:hidden items-center justify-center w-9 h-9 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-all duration-300"
      >
        <LayoutDashboard className="w-4 h-4" />
      </button>

      {/* Avatar con menu desplegable */}
      <div className="relative" ref={menuRef}>
        <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 focus:outline-none">
          {user?.avatar_url ? (
            <Image
              src={user.avatar_url}
              alt={user.name ?? 'Avatar'}
              width={36}
              height={36}
              className="w-9 h-9 rounded-full object-cover border-2 border-primary"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border border-primary flex items-center justify-center">
              <span className="text-primary font-bold text-sm">{getInitials()}</span>
            </div>
          )}
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 mt-2 w-56 dark:bg-gray-900/95 bg-white backdrop-blur-md rounded-xl dark:border-gray-800 border-gray-200 shadow-xl z-50 overflow-hidden"
            >
              <div className="p-2">
                {/* Informacion del usuario */}
                <div className="px-3 py-3 dark:border-gray-800 border-gray-200 mb-2">
                  <p className="text-sm font-semibold dark:text-white text-gray-900 truncate">{user?.name}</p>
                  <p className="text-xs dark:text-gray-400 text-gray-600 truncate mt-0.5">{user?.email}</p>
                  <div className="mt-2">
                    <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">{getRoleName()}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setIsOpen(false)
                    const role = user?.role
                    if (role === 'comercio') router.push('/business/profile')
                    else if (role === 'admin' || role === 'super_admin') router.push('/admin')
                    else router.push('/profile')
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm dark:text-gray-300 text-gray-700 dark:hover:bg-gray-800 hover:bg-gray-100 rounded-lg transition-all duration-200 group"
                >
                  <UserCircle className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                  <span>Mi Perfil</span>
                </button>

                <button
                  onClick={() => {
                    setIsOpen(false)
                    signOut()
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200 group"
                >
                  <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span>Cerrar Sesion</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
