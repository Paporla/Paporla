import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/requireAuth'
import { CalendarCheck, User, Store, Package } from 'lucide-react'
import { formatMinorPrice } from '@/lib/utils/formatPrice'
import { formatDate, formatPickupWindow } from '@/lib/utils/formatDate'
import { translateDbError } from '@/lib/utils/db-errors'

/**
 * Página /admin/reservations (Fase 6.5): sobre la RPC canónica
 * `list_admin_reservations` (0032). La versión anterior hacía
 * `.from('reservations')` con un join `shop:shops(name)` que no existe en el
 * esquema (no hay FK directa reservations→shops; la cadena pasa por packs) y
 * leía campos legacy inexistentes (total_price_cents, user_profiles.name).
 * El comercio y el pack salen de las snapshots de la propia reserva (0005).
 */

/** Fila que devuelve la RPC `list_admin_reservations` (0032). */
interface AdminReservationRow {
  reservation_id: string
  user_id: string | null
  user_name: string | null
  user_email: string | null
  shop_id: string
  shop_name: string | null
  shop_address: string | null
  pack_title: string | null
  total_amount_minor: number | string
  currency_code: string
  status: string
  payment_status: string
  pickup_start_at: string
  pickup_end_at: string
  timezone_snapshot: string
  created_at: string
  updated_at: string
}

const reservationStatusConfig: Record<string, { label: string; className: string }> = {
  payment_pending: { label: 'Pago pendiente', className: 'bg-amber-500/10 text-amber-400' },
  confirmed: { label: 'Confirmada', className: 'bg-blue-500/10 text-blue-400' },
  ready_pickup: { label: 'Lista para recoger', className: 'bg-primary/10 text-primary' },
  picked_up: { label: 'Recogida', className: 'bg-green-500/10 text-green-400' },
  completed: { label: 'Completada', className: 'bg-green-500/10 text-green-400' },
  cancelled: { label: 'Cancelada', className: 'bg-red-500/10 text-red-400' },
  no_show: { label: 'No show', className: 'bg-orange-500/10 text-orange-400' },
  expired: { label: 'Expirada', className: 'bg-gray-500/10 text-gray-400' },
}

export default async function AdminReservationsPage() {
  await requireAuth(['admin', 'super_admin'])

  const supabase = await createClient()

  const { data: rawReservations, error } = await supabase.rpc('list_admin_reservations', { p_limit: 200 })
  const reservations = (rawReservations ?? []) as unknown as AdminReservationRow[]

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
              {reservations.length} reservas en total — todas las transacciones
            </p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 text-center">
          <p className="text-red-400">Error al cargar reservas: {translateDbError(error)}</p>
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
                  <th className="text-left px-4 py-3 text-xs font-medium dark:text-gray-400 text-gray-600">Ventana</th>
                  <th className="text-left px-4 py-3 text-xs font-medium dark:text-gray-400 text-gray-600">Precio</th>
                  <th className="text-left px-4 py-3 text-xs font-medium dark:text-gray-400 text-gray-600">Estado</th>
                  <th className="text-right px-4 py-3 text-xs font-medium dark:text-gray-400 text-gray-600">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-white/5 divide-gray-200">
                {reservations.map((r) => {
                  const st = reservationStatusConfig[r.status] ?? {
                    label: r.status,
                    className: 'bg-gray-500/10 text-gray-400',
                  }
                  return (
                    <tr key={r.reservation_id} className="dark:hover:bg-white/5 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-500 flex-shrink-0" />
                          <div>
                            <p className="font-medium dark:text-white text-gray-900 text-xs">
                              {r.user_name ?? 'Usuario eliminado'}
                            </p>
                            <p className="text-[10px] dark:text-gray-500 text-gray-400">{r.user_email ?? ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-gray-500 flex-shrink-0" />
                          <span className="dark:text-gray-300 text-gray-700 truncate max-w-[150px]">
                            {r.pack_title ?? '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Store className="w-4 h-4 text-gray-500 flex-shrink-0" />
                          <div>
                            <span className="dark:text-gray-400 text-gray-600 text-xs">{r.shop_name ?? '—'}</span>
                            {r.shop_address ? (
                              <p className="text-[10px] dark:text-gray-500 text-gray-400">{r.shop_address}</p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[11px] dark:text-gray-400 text-gray-600 whitespace-nowrap">
                        {formatPickupWindow(
                          r.pickup_start_at,
                          r.pickup_end_at,
                          r.timezone_snapshot || 'America/Santiago',
                        )}
                      </td>
                      <td className="px-4 py-3 dark:text-gray-400 text-gray-600">
                        {formatMinorPrice(Number(r.total_amount_minor ?? 0), r.currency_code, 'es-CL')}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${st.className}`}>{st.label}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-[11px] dark:text-gray-500 text-gray-400">
                        {formatDate(r.created_at)}
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
