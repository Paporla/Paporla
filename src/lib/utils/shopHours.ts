/**
 * Lógica pura de horarios de comercio.
 *
 * Se mantiene separada de React y de Supabase para poder testearla sin mocks
 * y para que la convención de días viva en un único lugar.
 */

import {
  DAY_LABELS,
  DEFAULT_CLOSE,
  DEFAULT_OPEN,
  SEQUENCE_DEFAULT,
  displayIndexToWeekday,
  weekdayToDisplayIndex,
} from '@/lib/constants/hours'

/** Estado del formulario: un registro por etiqueta de día. */
export interface DayHours {
  open: string
  close: string
  closed: boolean
}

export type HoursData = Record<string, DayHours>

/** Fila tal y como la devuelve `get_my_shop().hours`. */
export interface ShopHourRow {
  weekday: number
  opens_at: string | null
  closes_at: string | null
  is_closed: boolean
}

/** Payload exacto que espera la RPC `set_shop_hour`. */
export interface SetShopHourArgs {
  p_shop_id: string
  p_weekday: number
  p_sequence: number
  p_opens_at: string | null
  p_closes_at: string | null
  p_is_closed: boolean
}

/** Estado inicial del formulario. Domingo cerrado por defecto. */
export function createDefaultHours(): HoursData {
  const initial: HoursData = {}
  for (const day of DAY_LABELS) {
    initial[day] = { open: DEFAULT_OPEN, close: DEFAULT_CLOSE, closed: day === 'Domingo' }
  }
  return initial
}

/** Normaliza `'09:00:00'` o `'09:00'` a `'09:00'`. */
function toInputTime(value: string | null, fallback: string): string {
  if (!value) return fallback
  return String(value).slice(0, 5)
}

/** Filas de la base de datos → estado del formulario. */
export function hoursRowsToFormState(rows: ShopHourRow[] | null | undefined): HoursData {
  const next = createDefaultHours()
  if (!rows?.length) return next

  for (const row of rows) {
    const day = DAY_LABELS[weekdayToDisplayIndex(row.weekday)]
    if (!day) continue
    next[day] = {
      open: toInputTime(row.opens_at, DEFAULT_OPEN),
      close: toInputTime(row.closes_at, DEFAULT_CLOSE),
      closed: !!row.is_closed,
    }
  }
  return next
}

/**
 * Estado del formulario → payloads de `set_shop_hour`, uno por día.
 *
 * Invariantes que impone el CHECK `shop_hours_times_check`:
 *   - Día cerrado  ⇒ `opens_at` y `closes_at` deben ser NULL.
 *   - Día abierto  ⇒ ambas presentes y `closes_at > opens_at` (estricto).
 */
export function buildShopHourPayloads(shopId: string, hoursMap: HoursData): SetShopHourArgs[] {
  return DAY_LABELS.map((day, displayIndex) => {
    const entry = hoursMap[day]
    const closed = !!entry?.closed

    return {
      p_shop_id: shopId,
      p_weekday: displayIndexToWeekday(displayIndex),
      p_sequence: SEQUENCE_DEFAULT,
      p_opens_at: closed ? null : (entry?.open ?? DEFAULT_OPEN),
      p_closes_at: closed ? null : (entry?.close ?? DEFAULT_CLOSE),
      p_is_closed: closed,
    }
  })
}

/**
 * Valida el formulario ANTES de llamar a la base de datos.
 * Evita que el CHECK devuelva un error críptico de Postgres al usuario.
 *
 * @returns lista de mensajes; vacía si todo es válido.
 */
export function validateHours(hoursMap: HoursData): string[] {
  const errors: string[] = []

  for (const day of DAY_LABELS) {
    const entry = hoursMap[day]
    if (!entry || entry.closed) continue

    if (!entry.open || !entry.close) {
      errors.push(`${day}: falta la hora de apertura o de cierre.`)
      continue
    }
    if (entry.close <= entry.open) {
      errors.push(`${day}: la hora de cierre (${entry.close}) debe ser posterior a la de apertura (${entry.open}).`)
    }
  }

  return errors
}
