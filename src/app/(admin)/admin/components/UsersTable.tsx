'use client'

import { motion } from 'framer-motion'
import { Edit, Mail, Calendar, Shield } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { formatDate } from '@/lib/utils/formatDate'
import { AdminUser } from '@/components/admin/useAdminUsers'

interface UsersTableProps {
  users: AdminUser[]
  currentUserId?: string
  onEdit: (user: AdminUser) => void
}

const roleLabels: Record<string, { label: string; color: string }> = {
  user: { label: 'Usuario', color: 'bg-primary/20 text-primary' },
  comercio: { label: 'Comercio', color: 'bg-secondary/20 text-secondary' },
  admin: { label: 'Admin', color: 'bg-primary/20 text-primary' },
  super_admin: { label: 'Super Admin', color: 'bg-secondary/20 text-secondary' },
}

/**
 * Tabla de usuarios del panel admin (Fase 6): columnas reales de
 * `user_profiles` (0003) — `display_name` y `phone_e164`, no `name`/`phone`.
 * Una sola acción por fila (editar rol); sin el propio admin, que la base no
 * deja cambiarse a sí mismo.
 */
export default function UsersTable({ users, currentUserId, onEdit }: UsersTableProps) {
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
                    <p className="font-medium dark:text-white text-gray-900">{user.display_name ?? 'Sin nombre'}</p>
                    <p className="text-xs dark:text-gray-500 text-gray-400 flex items-center gap-1 mt-0.5">
                      <Mail className="w-3 h-3" />
                      {user.email ?? 'Sin email'}
                    </p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="dark:text-gray-400 text-gray-600 text-sm">{user.phone_e164 ?? '—'}</span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${roleLabels[user.role]?.color ?? 'dark:bg-gray-500/20 bg-gray-200 dark:text-gray-400 text-gray-600'}`}
                  >
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
                  <div className="flex items-center justify-center">
                    {currentUserId !== user.id ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(user)}
                        ariaLabel={`Editar ${user.display_name ?? 'usuario'}`}
                        className="p-1.5"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    ) : (
                      <span
                        className="text-[10px] dark:text-gray-600 text-gray-500 px-2 py-1 rounded-full dark:bg-white/5 bg-gray-100"
                        title="No puedes cambiar tu propio rol: la base lo rechaza"
                      >
                        Tú
                      </span>
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
