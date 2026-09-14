'use client'

import { motion } from 'framer-motion'
import { ShoppingBag, Clock, CheckCircle, XCircle, DollarSign, Calendar, PackageCheck } from 'lucide-react'
import Card from '@/components/ui/Card'
import { formatMinorPrice } from '@/lib/utils/formatPrice'
import type { BusinessReservationStats } from './useBusinessReservations'

interface ReservationStatsBarProps {
  stats: BusinessReservationStats
}

const statItems: {
  key: keyof BusinessReservationStats
  label: string
  color: string
  icon: React.ComponentType<{ className?: string }>
  bg: string
  isPrice?: boolean
}[] = [
  { key: 'todayCount', label: 'Hoy', color: 'text-primary', icon: Calendar, bg: 'bg-primary/10' },
  { key: 'total', label: 'Total', color: 'text-blue-400', icon: ShoppingBag, bg: 'bg-blue-500/10' },
  { key: 'pending', label: 'Pendientes', color: 'text-amber-400', icon: Clock, bg: 'bg-yellow-500/10' },
  { key: 'confirmed', label: 'Confirmadas', color: 'text-cyan-400', icon: CheckCircle, bg: 'bg-cyan-500/10' },
  { key: 'ready', label: 'Listas', color: 'text-primary', icon: PackageCheck, bg: 'bg-primary/10' },
  { key: 'completed', label: 'Recogidas', color: 'text-green-400', icon: CheckCircle, bg: 'bg-green-500/10' },
  { key: 'cancelled', label: 'Canceladas', color: 'text-red-400', icon: XCircle, bg: 'bg-red-500/10' },
  /*
   * L-43 (commit D): estos dos estados existían en los grupos de abajo y en el
   * filtro, pero NO tenían tarjeta: por eso los totales no cuadraban a la
   * vista. El hook ya los contaba (noShow, expired); solo faltaba mostrarlos.
   */
  { key: 'noShow', label: 'No retiradas', color: 'text-orange-400', icon: XCircle, bg: 'bg-orange-500/10' },
  { key: 'expired', label: 'Expiradas', color: 'text-gray-400', icon: Clock, bg: 'bg-gray-500/10' },
  { key: 'revenue', label: 'Ingresos', color: 'text-primary', icon: DollarSign, bg: 'bg-primary/10', isPrice: true },
]

export default function ReservationStatsBar({ stats }: ReservationStatsBarProps) {
  const getValue = (item: (typeof statItems)[number]) => {
    if (item.isPrice) {
      // Ingresos en CLP (mercado piloto Chile), formateado como moneda
      // canónica: sin la vieja división entre 100 de la era centavos.
      return formatMinorPrice(stats.revenue, 'CLP', 'es-CL')
    }
    return stats[item.key]
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 md:grid-cols-5 xl:grid-cols-10 gap-3">
        {statItems.map((item, idx) => (
          <motion.div
            key={item.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <Card glass className="p-3 text-center">
              <div className={`p-1.5 rounded-lg ${item.bg} inline-flex mx-auto mb-2`}>
                <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
              </div>
              <p className={`text-lg font-bold ${item.color}`}>{getValue(item)}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{item.label}</p>
            </Card>
          </motion.div>
        ))}
      </div>
      {/* L-43: una línea que diga qué cuenta este bloque, para que nadie
          intente cuadrarlo a ciegas con los grupos de abajo. */}
      <p className="text-[11px] text-gray-500 dark:text-gray-500">
        El resumen cuenta TODAS tus reservas por estado, de hoy y de siempre. Mas abajo estan agrupadas con su detalle.
      </p>
    </div>
  )
}
