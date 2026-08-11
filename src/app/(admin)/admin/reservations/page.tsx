import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/requireAuth'
import { CalendarCheck, User, Store, Package } from 'lucide-react'
import { formatPrice } from '@/lib/utils/formatPrice'
import { formatRelativeTime } from '@/lib/utils/formatTime'

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'bg-amber-500/10 text-amber-400' },
  confirmed: { label: 'Confirmada', color: 'bg-green-500/10 text-green-400' },
  cancelled: { label: 'Cancelada', color: 'bg-red-500/10 text-red-400' },
  picked_up: { label: 'Recogida', color: 'bg-blue-500/10 text-blue-400' },
  no_show: { label: 'No show', color: 'bg-gray-500/10 text-gray-400' },
  ready_pickup: { label: 'Lista', color: 'bg-primary/10 text-primary' },
  expired: { label: 'Expirada', color: 'bg-gray-500/10 text-gray-400' },
  completed: { label: 'Completada', color: 'bg-green-500/10 text-green-400' },
}

export default async function AdminReservationsPage() {
  await requireAuth(['admin', 'super_admin'])

  const supabase = await createClient()

  // Consultar reservas con pack y shop (user_profiles no tiene FK directa desde reservations)
  const { data: reservations, error } = await supabase
    .from('reservations')
    .select('*, pack:packs(title), shop:shops(name)')
    .order('created_at', { ascending: false })
    .limit(200)

  // Obtener nombres de usuarios por separado (user_id referencia auth.users, no user_profiles)
  const userMap = new Map<string, { name: string; email: string }>()
  if (reservations && reservations.length > 0) {
    const userIds = [...new Set(reservations.map((r) => r.user_id as string))]
    const { data: profiles } = await supabase.from('user_profiles').select('id, name, email').in('id', userIds)
    if (profiles) {
      for (const p of profiles) {
        userMap.set(p.id, { name: p.name ?? '', email: p.email ?? '' })
      }
    }
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 -mt-8 -mx-4 px-4 py-8 rounded-b-3xl">
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <CalendarCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold dark:text-white text-gray-900">Reservas</h1>
            <p className="dark:text-gray-400 text-gray-600 text-sm">
              {reservations?.length ?? 0} reservas en total — todas las transacciones
            </p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 text-center">
          <p className="text-red-400">Error al cargar reservas: {error.message}</p>
        </div>
      ) : !reservations || reservations.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <CalendarCheck className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="dark:text-gray-400 text-gray-600">No hay reservas registradas</p>
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="dark:bg-white/5 bg-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium dark:text-gray-400 text-gray-600">Usuario</th>
                  <th className="text-left px-4 py-3 text-xs font-medium dark:text-gray-400 text-gray-600">Pack</th>
                  <th className="text-left px-4 py-3 text-xs font-medium dark:text-gray-400 text-gray-600">Comercio</th>
                  <th className="text-left px-4 py-3 text-xs font-medium dark:text-gray-400 text-gray-600">Precio</th>
                  <th className="text-left px-4 py-3 text-xs font-medium dark:text-gray-400 text-gray-600">Estado</th>
                  <th className="text-right px-4 py-3 text-xs font-medium dark:text-gray-400 text-gray-600">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-white/5 divide-gray-200">
                {reservations.map((r: Record<string, unknown>) => {
                  const user = userMap.get(r.user_id as string) ?? { name: '—', email: '' }
                  const pack = r.pack as { title?: string } | null
                  const shop = r.shop as { name?: string } | null
                  const status = (r.status as string) ?? 'pending'
                  const st = statusLabels[status] ?? { label: status, color: 'bg-gray-500/10 text-gray-400' }

                  return (
                    <tr key={r.id as string} className="dark:hover:bg-white/5 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-500 flex-shrink-0" />
                          <div>
                            <p className="font-medium dark:text-white text-gray-900 text-xs">{user?.name ?? '—'}</p>
                            <p className="text-[10px] dark:text-gray-500 text-gray-400">{user?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-gray-500 flex-shrink-0" />
                          <span className="dark:text-gray-300 text-gray-700 truncate max-w-[150px]">
                            {pack?.title ?? '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Store className="w-4 h-4 text-gray-500 flex-shrink-0" />
                          <span className="dark:text-gray-400 text-gray-600 text-xs">{shop?.name ?? '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 dark:text-gray-400 text-gray-600">
                        {formatPrice((r.total_price_cents as number) ?? 0)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-[11px] dark:text-gray-500 text-gray-400">
                        {formatRelativeTime(r.created_at as string)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
