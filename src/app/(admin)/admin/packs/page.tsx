import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/requireAuth'
import Link from 'next/link'
import { Package, Eye } from 'lucide-react'
import { formatPrice } from '@/lib/utils/formatPrice'

export default async function AdminPacksPage() {
  await requireAuth(['admin', 'super_admin'])

  const supabase = await createClient()

  const { data: packs, error } = await supabase
    .from('packs')
    .select('*, shop:shops(name)')
    .order('created_at', { ascending: false })
    .limit(200)

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
              {packs?.length ?? 0} packs en total — gestion de todos los comercios
            </p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 text-center">
          <p className="text-red-400">Error al cargar packs: {error.message}</p>
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
                  <th className="text-right px-4 py-3 text-xs font-medium dark:text-gray-400 text-gray-600">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-white/5 divide-gray-200">
                {packs.map((pack: Record<string, unknown>) => {
                  const shop = pack.shop as { name?: string } | null
                  return (
                    <tr key={pack.id as string} className="dark:hover:bg-white/5 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium dark:text-white text-gray-900 truncate max-w-[200px]">
                          {pack.title as string}
                        </p>
                      </td>
                      <td className="px-4 py-3 dark:text-gray-400 text-gray-600">{shop?.name ?? '—'}</td>
                      <td className="px-4 py-3 dark:text-gray-400 text-gray-600">
                        {formatPrice((pack.price_cents as number) ?? 0)}
                      </td>
                      <td className="px-4 py-3 dark:text-gray-400 text-gray-600">
                        {String(pack.remaining_stock ?? 0)}/{String(pack.total_stock ?? 0)}
                      </td>
                      <td className="px-4 py-3">
                        {pack.is_active ? (
                          <span className="text-[10px] bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full">
                            Activo
                          </span>
                        ) : (
                          <span className="text-[10px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full">
                            Inactivo
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/packs/${pack.id}`}
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
