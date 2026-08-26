// ============================================
// CONSTANTES — Reservas (lado usuario)
// ============================================

/**
 * Estados canónicos de una reserva: la lista EXACTA que valida la base de
 * datos (list_shop_reservations, 0014:333) y la que producen las funciones
 * canónicas (create_payment_reservation nace en 'payment_pending').
 *
 * OJO: NO existe estado 'pending' — ese era legado de la tabla vieja. El
 * lado business se migró a esta lista canónica en la fase 4.
 */
export const RESERVATION_STATUSES = [
  'payment_pending',
  'confirmed',
  'ready_pickup',
  'picked_up',
  'completed',
  'cancelled',
  'no_show',
  'expired',
] as const

export type ReservationStatus = (typeof RESERVATION_STATUSES)[number]

export interface StatusConfig {
  label: string
  color: string
  bg: string
  border: string
}

/**
 * Etiqueta y colores por estado.
 *
 * Tipado como Record<string, StatusConfig> a propósito: la base manda
 * `text`, y si algún día llega un estado que todavía no pintamos, la
 * seguridad la da `getStatusConfig` (abajo), no esta tabla.
 */
export const STATUS_CONFIG: Record<string, StatusConfig> = {
  payment_pending: {
    label: 'Aguardando confirmación',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  confirmed: {
    label: 'Confirmada',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
  ready_pickup: {
    label: 'Lista para recoger',
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/20',
  },
  picked_up: {
    label: 'Recogido',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
  },
  completed: {
    label: 'Completada',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
  },
  cancelled: {
    label: 'Cancelada',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
  },
  no_show: {
    label: 'No retirada',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
  },
  expired: {
    label: 'Expirada',
    color: 'text-gray-400',
    bg: 'bg-gray-500/10',
    border: 'border-gray-500/20',
  },
}

/** Etiqueta corta por estado, derivada de STATUS_CONFIG (misma fuente). */
export const STATUS_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(STATUS_CONFIG).map(([status, config]) => [status, config.label]),
)

const FALLBACK_STATUS_CONFIG: StatusConfig = {
  label: 'Estado desconocido',
  color: 'text-gray-400',
  bg: 'bg-gray-500/10',
  border: 'border-gray-500/20',
}

/**
 * Configuración SEGURA para un estado: si llega un valor que todavía no
 * pintamos, se muestra su valor crudo en gris en vez de explotar o
 * inventarse una etiqueta.
 */
export function getStatusConfig(status: string): StatusConfig {
  return STATUS_CONFIG[status] ?? { ...FALLBACK_STATUS_CONFIG, label: status }
}

/**
 * Estados "activos" para el usuario: son exactamente los que
 * cancel_reservation (0009:366) todavía permite cancelar. La UI usa la
 * misma lista para el grupo "Activas" y para el botón de cancelar: si la
 * base dice que se puede cancelar, la UI la pinta como activa. Si algún día
 * la base cambia esa lista, este array es el único lugar a actualizar.
 */
const ACTIVE_STATUSES: readonly string[] = ['payment_pending', 'confirmed', 'ready_pickup']

export function isActiveStatus(status: string): boolean {
  return ACTIVE_STATUSES.includes(status)
}

export function canCancelStatus(status: string): boolean {
  return ACTIVE_STATUSES.includes(status)
}

/**
 * ¿Puede el comercio CONFIRMAR esta reserva? (piloto sin pagos, 0031)
 * Solo `payment_pending`: la confirmación emula la cadena de pagos
 * (confirmed -> ready_pickup + paid) y emite el código de recogida del
 * cliente, que la RPC devuelve una sola vez.
 */
export function canConfirmStatus(status: string): boolean {
  return status === 'payment_pending'
}

/** Instante de pickup_start_at en ms, o Infinity si no hay / está rota. */
function toPickupTime(value: string | null | undefined): number {
  if (!value) return Infinity
  const t = new Date(value).getTime()
  return Number.isNaN(t) ? Infinity : t
}

/**
 * Ordena reservas: las activas primero (la recogida más cercana al frente),
 * el resto después por la misma regla. No muta el array original.
 */
export function sortReservationsByPickupTime<R extends { status: string; pickup_start_at?: string | null }>(
  reservations: R[],
): R[] {
  return [...reservations].sort((a, b) => {
    const aActive = isActiveStatus(a.status) ? 0 : 1
    const bActive = isActiveStatus(b.status) ? 0 : 1
    if (aActive !== bActive) return aActive - bActive

    const aTime = toPickupTime(a.pickup_start_at)
    const bTime = toPickupTime(b.pickup_start_at)
    if (aTime === bTime) return 0
    if (aTime === Infinity) return 1
    if (bTime === Infinity) return -1
    return aTime - bTime
  })
}
