import Link from 'next/link'
import { Copy, PackageCheck, Coins, Wallet, CalendarClock, ArrowLeft } from 'lucide-react'
import Button from '@/components/ui/Button'
import { computeCommissionSplit } from '@/lib/utils/commission'
import { formatChilePesos } from '@/lib/utils/formatPrice'
import { formatPickupWindow } from '@/lib/utils/formatDate'

/**
 * Ficha de resumen de un pack en estado final (L-14, spec del fundador).
 *
 * Antes, al entrar desde el top de más vendidos a un pack expirado o agotado,
 * la página mostraba un muro de texto ("estado final... ya no se puede
 * editar... duplícalo") sin ninguna información útil. El comercio quiere saber
 * QUÉ LOGRÓ ese pack: cuántas unidades vendió, cuánta plata generó y cuándo
 * fue la recogida — y desde ahí, el camino obvio: duplicar y republicar.
 *
 * Componente de servidor puro (sin hooks): lo monta directamente la página
 * /business/packs/[id], que ya es server component.
 */

const FINAL_STATUS_LABELS: Record<string, string> = {
  sold_out: 'Agotado',
  expired: 'Expirado',
  archived: 'Archivado',
}

interface PackFinalSummaryProps {
  packId: string
  status: string
  totalStock: number
  remainingStock: number
  priceMinor: number
  pickupStartAt: string
  pickupEndAt: string
}

export default function PackFinalSummary({
  packId,
  status,
  totalStock,
  remainingStock,
  priceMinor,
  pickupStartAt,
  pickupEndAt,
}: PackFinalSummaryProps) {
  // Vendidos = lo que salió del stock; acotado por si algún dato viejo no cuadra.
  const sold = Math.min(Math.max(totalStock - remainingStock, 0), totalStock)
  const grossMinor = sold * priceMinor
  // Misma fuente de verdad que las tarjetas de ingresos (L-11): comisión
  // provisional del 10% hasta que exista el módulo de pagos.
  const { commissionMinor, netMinor } = computeCommissionSplit(grossMinor)
  const statusLabel = FINAL_STATUS_LABELS[status] ?? status

  const stats: Array<{
    icon: React.ComponentType<{ className?: string }>
    label: string
    value: string
    hint?: string
  }> = [
    { icon: PackageCheck, label: 'Unidades vendidas', value: `${sold} de ${totalStock}` },
    { icon: Coins, label: 'Ingresos brutos', value: formatChilePesos(grossMinor) },
    {
      icon: Wallet,
      label: 'Recibes (comisión prov. 10%)',
      value: formatChilePesos(netMinor),
      hint: `La plataforma se queda ${formatChilePesos(commissionMinor)}`,
    },
    { icon: CalendarClock, label: 'Recogida', value: formatPickupWindow(pickupStartAt, pickupEndAt) },
  ]

  return (
    <div className="rounded-2xl border dark:border-white/10 border-gray-200 dark:bg-white/5 bg-gray-50 p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-lg font-semibold dark:text-white text-gray-900">Esto es lo que logró el pack</h2>
            <span className="inline-flex items-center rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-0.5 text-xs text-yellow-300 font-medium">
              {statusLabel}
            </span>
          </div>
          <p className="text-sm dark:text-gray-400 text-gray-600 max-w-2xl">
            Está en estado final y ya no se puede editar, pero su historial sigue aquí. Si quieres volver a vender algo
            igual, duplícalo: se crea un pack nuevo con la misma información, listo para publicar.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border dark:border-white/10 border-gray-200 dark:bg-black/20 bg-white p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className="w-4 h-4 text-primary" />
              <p className="text-xs dark:text-gray-400 text-gray-500">{stat.label}</p>
            </div>
            <p className="text-lg font-bold dark:text-white text-gray-900">{stat.value}</p>
            {stat.hint && <p className="text-[11px] dark:text-gray-500 text-gray-400 mt-1">{stat.hint}</p>}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mt-6">
        <Link href={`/business/packs/${packId}/duplicate`}>
          <Button className="flex items-center gap-2">
            <Copy className="w-4 h-4" />
            Duplicar y republicar
          </Button>
        </Link>

        <Link href="/business/packs">
          <Button variant="outline" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Ir al listado de packs
          </Button>
        </Link>
      </div>
    </div>
  )
}
