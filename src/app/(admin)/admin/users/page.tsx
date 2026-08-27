'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { supabaseBrowser } from '@/lib/supabase/client'
import { useAdminUsers, AdminUser } from '@/components/admin/useAdminUsers'
import { translateDbError } from '@/lib/utils/db-errors'
import { motion } from 'framer-motion'
import { Users, Search, Filter } from 'lucide-react'
import Input from '@/components/ui/Input'
import Toast from '@/components/ui/Toast'
import UsersTable from '../components/UsersTable'
import UserModal from '../components/UserModal'
import LoadingSkeleton from '../components/LoadingSkeleton'

const ROLE_LABELS: Record<string, string> = {
  user: 'Usuario',
  comercio: 'Comercio',
  admin: 'Administrador',
  super_admin: 'Super Administrador',
}

/**
 * Gestión de usuarios (Fase 6): listado sobre `user_profiles` con las
 * columnas reales (`display_name`, `phone_e164`) y cambio de rol vía la RPC
 * canónica `admin_set_user_role` (0009:2287). Sin borrado: el esquema no
 * tiene camino canónico de eliminación de usuarios.
 */
export default function AdminUsersPage() {
  const { user: currentUser } = useAuth()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const { users, loading, error: usersError } = useAdminUsers()

  const filteredUsers = searchTerm
    ? users.filter(
        (user) =>
          user.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    : users

  const openUserModal = (user: AdminUser) => {
    setSelectedUser(user)
    setModalOpen(true)
  }

  /**
   * Cambio de rol vía `admin_set_user_role`: la base rechaza cambiarse a sí
   * mismo, roles inválidos y que un admin (no super) toque admin/super_admin.
   * Aquí solo se traduce el error a español.
   */
  const handleRoleChange = async (userId: string, newRole: string) => {
    const supabase = supabaseBrowser()
    const { error } = await supabase.rpc('admin_set_user_role', {
      p_target_user_id: userId,
      p_new_role: newRole,
    })
    if (error) {
      setError(translateDbError(error))
      return
    }
    setSuccess(`Rol actualizado a ${ROLE_LABELS[newRole] ?? newRole}`)
    setModalOpen(false)
    setSelectedUser(null)
    queryClient.invalidateQueries({ queryKey: ['admin-users'] })
  }

  if (loading) {
    return <LoadingSkeleton />
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl p-6 glass-card"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/20 rounded-xl">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gradient">Gestión de Usuarios</h1>
            <p className="dark:text-gray-400 text-gray-600 mt-1">
              Administra los usuarios de la plataforma. Puedes cambiar su rol.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Barra de búsqueda */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 dark:text-gray-500 text-gray-400" />
          <Input
            placeholder="Buscar por nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="text-sm dark:text-gray-400 text-gray-600 flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Total: {filteredUsers.length} usuarios
        </div>
      </div>

      {/* Tabla de usuarios */}
      <UsersTable users={filteredUsers} currentUserId={currentUser?.id} onEdit={openUserModal} />

      {/* Modal de edición */}
      <UserModal
        isOpen={modalOpen}
        user={selectedUser}
        onClose={() => {
          setModalOpen(false)
          setSelectedUser(null)
        }}
        onSave={handleRoleChange}
      />

      {(error || usersError) && <Toast message={error || usersError} type="error" onClose={() => setError('')} />}
      {success && <Toast message={success} type="success" onClose={() => setSuccess('')} />}
    </div>
  )
}
