import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/requireAuth'
import Link from 'next/link'
import { Package, Eye } from 'lucide-react'
import { formatMinorPrice } from '@/lib/utils/formatPrice'
import { formatDate } from '@/lib/utils/formatDate'
import { translateDbError } from '@/lib/utils/db-errors'

/**
 * Página /admin/packs (Fase 6.5): sobre la RPC canónica `list_admin_packs`
 * (0032). La versión anterior hacía `.from('packs')` directo —que el
 * esquema (0012) deniega: "permission denied for table packs"— y leía
 * campos legacy que no existen en la tabla real (price_cents, is_active).
 * Los valores reales: price_minor + currency_code y el enum de status
 * (0004: draft/active/paused/sold_out/expired/archived).
 */

/** Fila que devuelve la RPC `list_admin_packs` (0032). */
interface AdminPackRow {
  pack_id: string
  shop_id: string
  shop_name: string | null
  title: string
  description: string | null
  category: string
  price_minor: number | string
  original_price_minor: number | string | null
  currency_code: string
  total_stock: number
  remaining_stock: number
  status: string
  pickup_start_at: string
  pickup_end_at: string
  timezone_snapshot: string
  image_path: string | null
  created_at: string
  updated_at: string
}

const packStatusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: 'Borrador', className: 'bg-gray-500/10 text-gray-400' },
  active: { label: 'Activo', className: 'bg-green-500/10 text-green-400' },
  paused: { label: 'Pausado', className: 'bg-amber-500/10 text-amber-400' },
  sold_out: { label: 'Agotado', className: 'bg-red-500/10 text-red-400' },
  expired: { label: 'Expirado', className: 'bg-orange-500/10 text-orange-400' },
  archived: { label: 'Archivado', className: 'bg-gray-500/10 text-gray-500' },
}

export default async function AdminPacksPage() {
  await requireAuth(['admin', 'super_admin'])

  const supabase = await createClient()

  const { data: rawPacks, error } = await supabase.rpc('list_admin_packs', { p_limit: 200 })
  const packs = (rawPacks ?? []) as unknown as AdminPackRow[]

  return (
    <div className="space-y-6 pb-8">
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 -mt-8 -mx-4 px-4 py-8 rounded-b-3xl">
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Package className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold dark:text-white text-gray-900">Packs</h1>
            <p className="dark:text-gray-400 text-gray-600 text-sm">
              {packs.length} packs en total — gestion de todos los comercios
            </p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 text-center">
          <p className="text-red-400">Error al cargar packs: {translateDbError(error)}</p>
        </div>
      ) : !packs || packs.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <Package className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="dark:text-gray-400 text-gray-600">No hay packs registrados</p>
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="dark:bg-white/5 bg-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium dark:text-gray-400 text-gray-600">Pack</th>
                  <th className="text-left px-4 py-3 text-xs font-medium dark:text-gray-400 text-gray-600">Comercio</th>
                  <th className="text-left px-4 py-3 text-xs font-medium dark:text-gray-400 text-gray-600">Precio</th>
                  <th className="text-left px-4 py-3 text-xs font-medium dark:text-gray-400 text-gray-600">Stock</th>
                  <th className="text-left px-4 py-3 text-xs font-medium dark:text-gray-400 text-gray-600">Estado</th>
                  <th className="text-left px-4 py-3 text-xs font-medium dark:text-gray-400 text-gray-600">Registro</th>
                  <th className="text-right px-4 py-3 text-xs font-medium dark:text-gray-400 text-gray-600">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-white/5 divide-gray-200">
                {packs.map((pack) => {
                  const st = packStatusConfig[pack.status] ?? {
                    label: pack.status,
                    className: 'bg-gray-500/10 text-gray-400',
                  }
                  return (
                    <tr key={pack.pack_id} className="dark:hover:bg-white/5 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium dark:text-white text-gray-900 truncate max-w-[200px]">{pack.title}</p>
                        <p className="text-[10px] dark:text-gray-500 text-gray-400 capitalize">{pack.category}</p>
                      </td>
                      <td className="px-4 py-3 dark:text-gray-400 text-gray-600">{pack.shop_name ?? '—'}</td>
                      <td className="px-4 py-3 dark:text-gray-400 text-gray-600">
                        {formatMinorPrice(Number(pack.price_minor ?? 0), pack.currency_code, 'es-CL')}
                      </td>
                      <td className="px-4 py-3 dark:text-gray-400 text-gray-600">
                        {pack.remaining_stock}/{pack.total_stock}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${st.className}`}>{st.label}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-[11px] dark:text-gray-500 text-gray-400">
                        {formatDate(pack.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/packs/${pack.pack_id}`}
                            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                            title="Ver"
                          >
                            <Eye className="w-4 h-4 dark:text-gray-400 text-gray-600" />
                          </Link>
                        </div>
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
