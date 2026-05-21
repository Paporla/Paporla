'use client'

import { motion } from 'framer-motion'
import { Edit, Trash2, Mail, Calendar, Shield } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { formatDate } from '@/lib/utils/formatDate'
import { UserProfile } from '@/lib/supabase/types'

interface UsersTableProps {
  users: UserProfile[]
  currentUserId?: string
  onEdit: (user: UserProfile) => void
  onDelete: (userId: string) => void
}

const roleLabels: Record<string, { label: string; color: string }> = {
  user: { label: 'Usuario', color: 'bg-blue-500/20 text-blue-400' },
  comercio: { label: 'Comercio', color: 'bg-secondary/20 text-secondary' },
  admin: { label: 'Admin', color: 'bg-primary/20 text-primary' },
  super_admin: { label: 'Super Admin', color: 'bg-purple-500/20 text-purple-400' },
}

export default function UsersTable({ users, currentUserId, onEdit, onDelete }: UsersTableProps) {
  return (
    <Card glass className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b dark:border-gray-800 border-gray-200">
            <tr className="text-left dark:text-gray-400 text-gray-600 text-sm">
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3">Teléfono</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Registro</th>
              <th className="px-4 py-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, index) => (
              <motion.tr
                key={user.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="border-b dark:border-gray-800/50 border-gray-200 dark:hover:bg-gray-800/30 hover:bg-gray-100 transition-colors"
              >
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium dark:text-white text-gray-900">{user.name || 'Sin nombre'}</p>
                    <p className="text-xs dark:text-gray-500 text-gray-400 flex items-center gap-1 mt-0.5">
                      <Mail className="w-3 h-3" />
                      {user.email}
                    </p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="dark:text-gray-400 text-gray-600 text-sm">{user.phone || '—'}</span>
                </td>
                <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${roleLabels[user.role]?.color || 'dark:bg-gray-500/20 bg-gray-200 dark:text-gray-400 text-gray-600'}`}>
                    {roleLabels[user.role]?.label || user.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-xs dark:text-gray-500 text-gray-400">
                    <Calendar className="w-3 h-3" />
                    {formatDate(user.created_at)}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(user)}
                      className="p-1.5"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    {currentUserId !== user.id && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => onDelete(user.id)}
                        className="p-1.5"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {users.length === 0 && (
        <div className="text-center py-12">
          <Shield className="w-12 h-12 dark:text-gray-600 text-gray-400 mx-auto mb-3" />
          <p className="dark:text-gray-400 text-gray-600">No hay usuarios registrados</p>
        </div>
      )}
    </Card>
  )
}