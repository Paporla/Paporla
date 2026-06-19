'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Shield } from 'lucide-react'
import Button from '@/components/ui/Button'
import { UserProfile } from '@/lib/supabase/types'

interface UserModalProps {
  isOpen: boolean
  user: UserProfile | null
  onClose: () => void
  onSave: (userId: string, newRole: string) => void
}

const roles = [
  { value: 'user', label: 'Usuario', color: 'text-primary' },
  { value: 'comercio', label: 'Comercio', color: 'text-secondary' },
  { value: 'admin', label: 'Administrador', color: 'text-purple-400' },
  { value: 'super_admin', label: 'Super Administrador', color: 'text-red-400' },
]

export default function UserModal({ isOpen, user, onClose, onSave }: UserModalProps) {
  // Prevenir scroll del body cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!user) return null

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    const newRole = formData.get('role') as string
    onSave(user.id, newRole)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Fondo oscuro - ocupa toda la pantalla */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
          />

          {/* Modal centrado - FORZADO */}
          <div className="fixed inset-0 z-[101] flex items-center justify-center pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="pointer-events-auto w-full max-w-md mx-4"
            >
              <div className="dark:bg-black/90 bg-white backdrop-blur-xl rounded-2xl dark:border-white/10 border-gray-200 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b dark:border-white/10 border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Shield className="w-5 h-5 text-primary" />
                    </div>
                    <h2 className="text-xl font-bold dark:text-white text-gray-900">Editar Usuario</h2>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-1 rounded-lg dark:hover:bg-white/10 hover:bg-gray-100 transition-colors"
                  >
                    <X className="w-5 h-5 dark:text-gray-400 text-gray-600" />
                  </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSave} className="p-5 space-y-5">
                  <div>
                    <label className="block text-sm font-medium dark:text-gray-400 text-gray-600 mb-1">Nombre</label>
                    <p className="dark:text-white text-gray-900 font-medium">{user.name ?? 'Sin nombre'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium dark:text-gray-400 text-gray-600 mb-1">Email</label>
                    <p className="dark:text-white text-gray-900 font-medium">{user.email}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium dark:text-gray-400 text-gray-600 mb-2">Rol</label>
                    <select
                      name="role"
                      defaultValue={user.role}
                      className="w-full px-4 py-2 rounded-xl dark:bg-white/5 bg-gray-100 dark:border-white/10 border-gray-200 dark:text-white text-gray-900 focus:border-primary focus:outline-none transition-all"
                    >
                      {roles.map((role) => (
                        <option key={role.value} value={role.value} className={role.color}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                      Cancelar
                    </Button>
                    <Button type="submit" className="flex-1">
                      Guardar cambios
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
