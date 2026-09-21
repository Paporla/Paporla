'use client'

import { User, Store, Package, Eye } from 'lucide-react'
import { formatMinorPrice } from '@/lib/utils/formatPrice'
import { formatDate, formatPickupWindow } from '@/lib/utils/formatDate'
import { getReservationStatusConfig } from '@/lib/constants/reservationStatus'
import { AdminReservationRow } from '@/components/admin/useAdminReservations'

interface ReservationsTableProps {
  rows: AdminReservationRow[]
  onOpen: (reservation: AdminReservationRow) => void
}

/**
 * Tabla de reservas del panel admin (ADMIN-1). Presentacional: la página
 * decide qué filas mostrar (búsqueda y filtro por estado en el cliente sobre
 * la RPC canónica `list_admin_reservations`, 0032).
 *
 * ADMIN-1: cada fila abre la ficha (botón Detalle o clic en la fila). Antes
 * la tabla era muda: solo permitía hojear, imposible de usar para soporte.
 */
export default function ReservationsTable({ rows, onOpen }: ReservationsTableProps) {
  return (
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
              <th className="px-4 py-3">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-white/5 divide-gray-200">
            {rows.map((r) => {
              const st = getReservationStatusConfig(r.status)
              return (
                <tr
                  key={r.reservation_id}
                  onClick={() => onOpen(r)}
                  className="cursor-pointer dark:hover:bg-white/5 hover:bg-gray-50 transition-colors"
                >
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
                    {formatPickupWindow(r.pickup_start_at, r.pickup_end_at, r.timezone_snapshot || 'America/Santiago')}
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
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onOpen(r)
                      }}
                      className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg dark:bg-white/5 bg-gray-100 dark:text-gray-300 text-gray-700 hover:bg-primary/10 hover:text-primary transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Detalle
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
