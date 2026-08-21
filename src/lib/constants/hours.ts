/**
 * Convención canónica de días de la semana.
 *
 * DEBE coincidir con el CHECK de la tabla `shop_hours`:
 *   CHECK (weekday >= 0 AND weekday <= 6)
 *
 * 0 = domingo, 1 = lunes … 6 = sábado (igual que `Date.getDay()`).
 *
 * ⚠️ No cambiar sin una migración que actualice el constraint y los datos.
 */

/** Etiquetas en orden de PRESENTACIÓN (la semana empieza en lunes). */
export const DAY_LABELS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] as const

export type DayLabel = (typeof DAY_LABELS)[number]

/** CHECK (sequence >= 1 AND sequence <= 3) — la numeración empieza en 1, no en 0. */
export const SEQUENCE_DEFAULT = 1
export const SEQUENCE_MIN = 1
export const SEQUENCE_MAX = 3

/** Horas por defecto cuando el comercio no ha definido nada todavía. */
export const DEFAULT_OPEN = '09:00'
export const DEFAULT_CLOSE = '18:00'

/**
 * Índice de presentación (0 = Lunes … 6 = Domingo)
 *   → weekday canónico (0 = Domingo … 6 = Sábado).
 *
 * Lunes(0)→1, Martes(1)→2, … Sábado(5)→6, Domingo(6)→0
 */
export function displayIndexToWeekday(displayIndex: number): number {
  return (displayIndex + 1) % 7
}

/**
 * weekday canónico → índice de presentación. Inversa exacta de la anterior.
 *
 * Domingo(0)→6, Lunes(1)→0, … Sábado(6)→5
 */
export function weekdayToDisplayIndex(weekday: number): number {
  return (weekday + 6) % 7
}

/** Etiqueta legible a partir del weekday canónico. `null` si está fuera de rango. */
export function weekdayToLabel(weekday: number): DayLabel | null {
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) return null
  return DAY_LABELS[weekdayToDisplayIndex(weekday)]
}
