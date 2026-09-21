'use client'

import { DollarSign, Leaf, AlertTriangle, Package } from 'lucide-react'
import Skeleton from '@/components/ui/Skeleton'
import { formatMinorPrice } from '@/lib/utils/formatPrice'
import { useAdminBusiness } from '@/components/admin/useAdminBusiness'

/**
 * Números de negocio del Overview (ADMIN-3, RPC `admin_business_snapshot`
 * de 0055): ventas cobradas, "packs salvados" (reservas retiradas +
 * completadas — el lema de la casa), tasa de cancelación (canceladas +
 * no show) y packs activos/pausados. Es informativo a propósito: no repite
 * los contadores de plataforma de AdminStatCards.
 */
export default function AdminBusinessCards() {
  const { business, loading, error } = useAdminBusiness()

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-2xl" />
        ))}
      </div>
    )
  }

  if (error || !business) {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm dark:text-amber-400 text-amber-600">
        No se pudieron cargar los números de negocio: {error || 'sin datos'}
      </div>
    )
  }

  const currency = business.currency ?? 'CLP'
  const tarjetas = [
    {
      icon: DollarSign,
      label: 'Ventas cobradas',
      valor: formatMinorPrice(Number(business.revenue_minor ?? 0), currency, 'es-CL'),
      sub: `${business.paid_count} reservas pagadas`,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
    },
    {
      icon: Leaf,
      label: 'Packs salvados',
      valor: String(business.units_saved ?? 0),
      sub: 'retiradas + completadas',
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      icon: AlertTriangle,
      label: 'Tasa de cancelación',
      valor: `${business.cancel_rate ?? 0}%`,
      sub: `${business.cancelled_count} canceladas · ${business.no_show_count} no show`,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
    {
      icon: Package,
      label: 'Packs activos ahora',
      valor: String(business.packs_active ?? 0),
      sub: `${business.packs_paused ?? 0} pausados por el panel o el comercio`,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
  ]

  return (
    <div>
      <h2 className="text-lg font-semibold dark:text-white text-gray-900 mb-4">Números de negocio</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {tarjetas.map((t) => (
          <div key={t.label} className="glass-card rounded-2xl p-5 flex items-center gap-4">
            <div className={`p-3 rounded-xl ${t.bg}`}>
              <t.icon className={`w-6 h-6 ${t.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium dark:text-gray-400 text-gray-600 uppercase tracking-wide">{t.label}</p>
              <p className="text-2xl font-bold dark:text-white text-gray-900 leading-tight">{t.valor}</p>
              <p className="text-[11px] dark:text-gray-500 text-gray-400 truncate">{t.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
