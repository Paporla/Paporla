/**
 * Lógica pura del botón "Reservar" y de la ventana de recogida en la página
 * de detalle de pack. Separada de los componentes para poder testearla sin
 * renderizar nada.
 */

/** Motivo por el que el botón "Reservar" queda deshabilitado. */
export type ReserveBlockReason = 'sold-out' | 'window-passed'

export interface ReserveButtonInput {
  /** Stock restante del pack (search_available_packs). */
  remainingStock: number
  /** Fin de la ventana de recogida, ISO 8601 (search_available_packs). */
  pickupEndAt: string | null
  /** Instante actual; inyectable para tests. */
  now?: Date
}

/**
 * Decide si el botón "Reservar" debe deshabilitarse y por qué.
 * Devuelve `null` cuando el pack puede reservarse.
 *
 * Cada razón mapea a un texto visible en la UI: un control deshabilitado
 * SIEMPRE explica por qué (regla del proyecto).
 */
export function getReserveBlockReason(input: ReserveButtonInput): ReserveBlockReason | null {
  const now = input.now ?? new Date()

  if (input.remainingStock <= 0) return 'sold-out'

  if (input.pickupEndAt) {
    const end = new Date(input.pickupEndAt)
    if (!Number.isNaN(end.getTime()) && end.getTime() <= now.getTime()) return 'window-passed'
  }

  return null
}

/**
 * Formatea la ventana de recogida en el horario del mercado.
 *
 * - Mismo día: "viernes 4 de sept., 7:00 p. m.–11:00 p. m."
 * - Dos días:  "viernes 4 de sept., 7:00 p. m. – sábado 5 de sept., 1:00 a. m."
 * - Un solo lado: etiqueta única.
 *
 * Devuelve `null` si no hay datos válidos o la zona horaria no existe:
 * mejor sin etiqueta que una hora mentirosa.
 */
export function formatPickupWindow(
  startAt: string | null,
  endAt: string | null,
  timezone: string | null,
): string | null {
  const tz = timezone && timezone.length > 0 ? timezone : 'America/Santiago'

  try {
    const s = startAt ? parseDate(startAt) : null
    const e = endAt ? parseDate(endAt) : null

    const day = (d: Date) =>
      new Intl.DateTimeFormat('es-CL', { weekday: 'long', day: 'numeric', month: 'short', timeZone: tz }).format(d)
    const time = (d: Date) =>
      new Intl.DateTimeFormat('es-CL', { hour: 'numeric', minute: '2-digit', timeZone: tz }).format(d)
    const dayKey = (d: Date) =>
      new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)

    if (!s && !e) return null
    if (s && e) {
      if (dayKey(s) === dayKey(e)) return `${day(s)}, ${time(s)}–${time(e)}`
      return `${day(s)}, ${time(s)} – ${day(e)}, ${time(e)}`
    }
    const d = s ?? e
    if (!d) return null
    return `${day(d)}, ${time(d)}`
  } catch {
    // Zona horaria inválida (p. ej. un valor basura en timezone_snapshot).
    return null
  }
}

function parseDate(value: string): Date | null {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}
