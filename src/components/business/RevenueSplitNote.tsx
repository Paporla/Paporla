import { computeCommissionSplit } from '@/lib/utils/commission'
import { formatChilePesos } from '@/lib/utils/formatPrice'

/**
 * La verdad del dinero en una línea (L-11, pedido del fundador 2026-09-09):
 * el comercio debe ver cuánto recibe realmente sin restar comisiones de
 * cabeza. Se coloca bajo los ingresos brutos de las tarjetas del dashboard y
 * de analytics.
 *
 * Comisión provisional del 10% hasta que exista el módulo de pagos (la misma
 * que ya muestran las stats de admin, 0032/0033). El desglose completo
 * Total/Comisión/Recibes vive en el title para quien pase el ratón.
 */
export default function RevenueSplitNote({ grossMinor }: { grossMinor: number }) {
  const { commissionMinor, netMinor } = computeCommissionSplit(grossMinor)
  const title = `Total ${formatChilePesos(grossMinor)} − comisión provisional ${formatChilePesos(
    commissionMinor,
  )} (10%) = recibes ${formatChilePesos(netMinor)}. La comisión definitiva llegará con el módulo de pagos.`

  return (
    <p className="text-[10px] text-gray-400 mt-1 leading-tight" title={title}>
      Recibes {formatChilePesos(netMinor)} · comisión prov. 10%
    </p>
  )
}
