'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { supabaseBrowser } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import { Users, Search, Filter } from 'lucide-react'
import Input from '@/components/ui/Input'
import Toast from '@/components/ui/Toast'
import ConfirmModal from '@/components/ui/ConfirmModal'
import EmptyState from '@/components/ui/EmptyState'
import UsersTable from '../components/UsersTable'
import UserModal from '../components/UserModal'
import LoadingSkeleton from '../components/LoadingSkeleton'
import { UserProfile } from '@/lib/supabase/types'

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth()
  const supabase = supabaseBrowser()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<string | null>(null)

  const { data: users = [], isLoading: loading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_profiles').select('*').order('created_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as UserProfile[]
    },
    staleTime: 30 * 1000,
  })

  const filteredUsers = searchTerm
    ? users.filter(
        (user) =>
          user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    : users

  const invalidateUsers = () => queryClient.invalidateQueries({ queryKey: ['admin-users'] })

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: string }) => {
      const { error } = await supabase.from('user_profiles').update({ role: newRole }).eq('id', userId)

      if (error) throw error
    },
    onSuccess: () => {
      setSuccess('Rol actualizado correctamente')
      invalidateUsers()
    },
    onError: (err: Error) => setError(err.message),
    onSettled: () => {
      setModalOpen(false)
      setSelectedUser(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from('user_profiles').delete().eq('id', userId)

      if (error) throw error
    },
    onSuccess: () => {
      setSuccess('Usuario eliminado correctamente')
      invalidateUsers()
    },
    onError: (err: Error) => setError(err.message),
    onSettled: () => {
      setDeleteModalOpen(false)
      setUserToDelete(null)
    },
  })

  const handleRoleChange = async (userId: string, newRole: string) => {
    await updateRoleMutation.mutateAsync({ userId, newRole })
  }

  const confirmDelete = (userId: string) => {
    setUserToDelete(userId)
    setDeleteModalOpen(true)
  }

  const handleDeleteUser = async () => {
    if (!userToDelete) return
    await deleteMutation.mutateAsync(userToDelete)
  }

  const openUserModal = (user: UserProfile) => {
    setSelectedUser(user)
    setModalOpen(true)
  }

  if (loading) {
    return <LoadingSkeleton />
  }

  if (filteredUsers.length === 0 && !loading) {
    return (
      <EmptyState
        type="search"
        action={{
          label: 'Limpiar búsqueda',
          onClick: () => setSearchTerm(''),
        }}
      />
    )
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
              Administra los usuarios de la plataforma. Puedes cambiar roles, editar o eliminar.
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
      <UsersTable
        users={filteredUsers}
        currentUserId={currentUser?.id}
        onEdit={openUserModal}
        onDelete={confirmDelete}
      />

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

      {/* Modal de confirmación para eliminar */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteUser}
        title="Eliminar usuario"
        message="¿Estás seguro de que quieres eliminar este usuario? Esta acción no se puede deshacer."
        confirmText="Sí, eliminar"
        cancelText="Cancelar"
      />

      {error && <Toast message={error} type="error" onClose={() => setError('')} />}
      {success && <Toast message={success} type="success" onClose={() => setSuccess('')} />}
    </div>
  )
}
