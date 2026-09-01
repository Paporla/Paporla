'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Package,
  Edit,
  CheckCircle,
  EyeOff,
  AlertCircle,
  Clock,
  Copy,
  Play,
  Pause,
  Send,
  FileEdit,
  XCircle,
  CalendarX,
  Trash2,
} from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { formatMinorPrice } from '@/lib/utils/formatPrice'
import { formatDate } from '@/lib/utils/formatDate'
import {
  canArchivePack,
  getArchiveBlockedReason,
  getPackAction,
  getPackActionDisabledReason,
  type PackActionKind,
  type PackStatus,
} from '@/lib/utils/packActions'
import type { BusinessPack } from './useBusinessPacks'

type BadgeStyle = { label: string; className: string; Icon: typeof CheckCircle }

/**
 * Insignia de estado del pack.
 *
 * Antes solo se distinguía "Activo" / "Inactivo", de modo que un borrador, un
 * pack pausado, uno agotado y uno caducado se veían exactamente igual: gris e
 * "Inactivo". Son situaciones muy distintas y cada una pide una acción distinta
 * del comerciante.
 */
const STATUS_BADGES: Record<PackStatus, BadgeStyle> = {
  draft: { label: 'Borrador', className: 'bg-gray-500/20 text-gray-400', Icon: FileEdit },
  active: { label: 'Publicado', className: 'bg-green-500/20 text-green-400', Icon: CheckCircle },
  paused: { label: 'En pausa', className: 'bg-amber-500/20 text-amber-500', Icon: EyeOff },
  sold_out: { label: 'Agotado', className: 'bg-blue-500/20 text-blue-400', Icon: XCircle },
  expired: { label: 'Caducado', className: 'bg-gray-500/20 text-gray-400', Icon: CalendarX },
  archived: { label: 'Eliminado', className: 'bg-gray-500/20 text-gray-500', Icon: XCircle },
}

const FALLBACK_BADGE: BadgeStyle = {
  label: 'Desconocido',
  className: 'bg-gray-500/20 text-gray-400',
  Icon: AlertCircle,
}

/**
 * Presentación de cada acción. La lógica de negocio (qué RPC, con qué argumentos)
 * vive en `packActions.ts`; aquí solo decidimos cómo se ve el botón.
 */
const ACTION_STYLES: Record<
  Exclude<PackActionKind, 'none'>,
  { Icon: typeof Send; variant: 'primary' | 'outline'; pendingLabel: string }
> = {
  publish: { Icon: Send, variant: 'primary', pendingLabel: 'Publicando…' },
  pause: { Icon: Pause, variant: 'outline', pendingLabel: 'Pausando…' },
  resume: { Icon: Play, variant: 'primary', pendingLabel: 'Reanudando…' },
}

function getStockStatus(remaining: number, total: number) {
  // Un pack sin stock total no debería existir, pero si llega uno no dividimos entre cero.
  if (total <= 0) return { label: 'Sin stock', color: 'bg-red-500/20 text-red-400', icon: AlertCircle }
  const pct = (remaining / total) * 100
  if (pct === 0) return { label: 'Agotado', color: 'bg-red-500/20 text-red-400', icon: AlertCircle }
  if (pct < 20) return { label: 'Stock bajo', color: 'bg-yellow-500/20 text-yellow-400', icon: AlertCircle }
  return { label: 'Disponible', color: 'bg-green-500/20 text-green-400', icon: CheckCircle }
}

interface Props {
  pack: BusinessPack
  index: number
  /** Id del pack cuya acción de estado está en curso, o `null` si no hay ninguna. */
  updatingPackId: string | null
  /** Publica, pausa o reanuda el pack según su estado actual. */
  onChangeState: (id: string) => void
  /** Id del pack que se está eliminando, o `null`. */
  archivingPackId: string | null
  /** Pide confirmación para eliminar. No elimina: la confirmación vive en la página. */
  onRequestDelete: (pack: BusinessPack) => void
}

export default function PackCard({
  pack,
  index,
  updatingPackId,
  onChangeState,
  archivingPackId,
  onRequestDelete,
}: Props) {
  /*
   * El badge de disponibilidad solo se muestra cuando el pack está a la venta
   * (active): describe si queda stock AHORA. En cualquier otro estado miente
   * («Caducado» + «Disponible» a la vez) o duplica el badge de estado
   * («Agotado» dos veces en un sold_out). La línea "Stock: x/y" de abajo
   * conserva el dato numérico en todos los estados.
   */
  const stock = pack.status === 'active' ? getStockStatus(pack.remaining_stock, pack.total_stock) : null
  const StockIcon = stock?.icon ?? null
  const pct = pack.total_stock > 0 ? Math.round((pack.remaining_stock / pack.total_stock) * 100) : 0

  const badge = STATUS_BADGES[pack.status as PackStatus] ?? FALLBACK_BADGE
  const BadgeIcon = badge.Icon

  const action = getPackAction(pack.status)
  const style = action.kind === 'none' ? null : ACTION_STYLES[action.kind]
  const disabledReason = getPackActionDisabledReason(pack.status)
  const isUpdating = updatingPackId === pack.id
  const isArchiving = archivingPackId === pack.id
  const canDelete = canArchivePack(pack.status)

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
      <Card glass hover className="p-5 group">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h3 className="text-lg font-semibold dark:text-white text-gray-900 group-hover:text-primary transition-colors">
                {pack.title}
              </h3>
              <span
                className={`text-xs ${badge.className} px-2 py-0.5 rounded-full flex items-center gap-1`}
                data-testid="pack-status-badge"
              >
                <BadgeIcon className="w-3 h-3" /> {badge.label}
              </span>
              {stock && StockIcon && (
                <span className={`text-xs ${stock.color} px-2 py-0.5 rounded-full flex items-center gap-1`}>
                  <StockIcon className="w-3 h-3" /> {stock.label}
                </span>
              )}
            </div>

            {pack.description && (
              <p className="text-sm dark:text-gray-400 text-gray-600 mb-2 line-clamp-1">{pack.description}</p>
            )}

            <div className="flex flex-wrap gap-4 text-sm">
              <span className="text-primary font-semibold text-lg">
                {formatMinorPrice(pack.price_minor, pack.currency_code, 'es-CL')}
              </span>
              <span className="text-gray-500 flex items-center gap-1">
                <Package className="w-3 h-3" /> Stock: {pack.remaining_stock}/{pack.total_stock}
              </span>
              {pack.ends_at && (
                <span className="text-gray-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Hasta: {formatDate(pack.ends_at)}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/business/packs/${pack.id}/duplicate`} aria-label={`Duplicar ${pack.title}`}>
              <Button variant="outline" size="sm" className="p-2">
                <Copy className="w-4 h-4" />
              </Button>
            </Link>
            <Link href={`/business/packs/${pack.id}`} aria-label={`Editar ${pack.title}`}>
              <Button variant="outline" size="sm" className="p-2">
                <Edit className="w-4 h-4" />
              </Button>
            </Link>

            {/*
              Botón de estado CON TEXTO, nunca un icono suelto.

              Antes aquí había una papelera roja que en realidad llamaba a
              `set_pack_paused`: el comerciante no se atrevía a pulsarla por
              miedo a borrar su pack, y quien la pulsaba esperando borrar se
              llevaba un susto. El rojo comunica destrucción; pausar no destruye.
            */}
            {style ? (
              <Button
                variant={style.variant}
                size="sm"
                onClick={() => onChangeState(pack.id)}
                disabled={isUpdating}
                aria-label={`${action.label}: ${pack.title}`}
                className="flex items-center gap-1.5"
                data-testid="pack-state-button"
              >
                {isUpdating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>{style.pendingLabel}</span>
                  </>
                ) : (
                  <>
                    <style.Icon className="w-4 h-4" />
                    <span>{action.label}</span>
                  </>
                )}
              </Button>
            ) : (
              disabledReason && (
                <span
                  className="text-xs dark:text-gray-500 text-gray-400 max-w-[10rem] text-right"
                  data-testid="pack-no-action"
                >
                  {disabledReason}
                </span>
              )
            )}

            {/*
              Eliminar es la única acción destructiva de la tarjeta, así que va
              en gris y separada por un divisor: se encuentra cuando se busca,
              pero no compite con Publicar/Pausar ni intimida como la papelera
              roja anterior. El rojo aparece solo al confirmar, dentro del modal.

              Un pack publicado no se puede eliminar: primero hay que pausarlo.
              En ese caso el botón se muestra deshabilitado, no oculto, para que
              el comerciante vea que la opción existe y por qué no está activa.
            */}
            {/*
              Solo mostramos el botón cuando la acción es posible.

              Un pack publicado no se puede eliminar (hay que pausarlo antes), y
              en ese caso enseñamos el motivo como texto en lugar de un botón
              apagado: un botón deshabilitado no explica nada, y si el motivo va
              en un `title` no lo ve nadie en móvil ni navegando con teclado.
            */}
            <div className="w-px h-8 dark:bg-gray-700 bg-gray-200 mx-1" aria-hidden="true" />
            {canDelete ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRequestDelete(pack)}
                disabled={isArchiving}
                ariaLabel={`Eliminar ${pack.title}`}
                className="p-2 hover:text-red-500"
                data-testid="pack-delete-button"
              >
                {isArchiving ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </Button>
            ) : (
              <span
                className="text-xs dark:text-gray-500 text-gray-400 max-w-[8rem] text-right"
                data-testid="pack-delete-blocked"
              >
                {getArchiveBlockedReason(pack.status)}
              </span>
            )}
          </div>
        </div>

        <div className="mt-3">
          <div className="flex justify-between text-xs dark:text-gray-500 text-gray-400 mb-1">
            <span>Stock restante</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 dark:bg-gray-700 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
