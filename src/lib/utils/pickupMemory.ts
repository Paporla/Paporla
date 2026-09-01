/**
 * Memoria del último horario de recogida usado (Lote D simplificación UX).
 *
 * Un comercio publica casi siempre con la misma ventana ("de 19 a 21, al
 * cierre"). El formulario de pack nuevo nacía con las horas vacías y había
 * que elegirlas cada día: aquí se guarda la última ventana con la que se
 * GUARDÓ un pack y el siguiente pack nuevo nace con ella puesta. El comercio
 * primerizo no nota nada (no hay memoria aún); el habitual solo revisa y
 * publica.
 *
 * Es una preferencia de UI pura: vive en localStorage, nunca viaja al
 * servidor y perderla no rompe nada (el formulario vuelve a nacer vacío).
 * Por eso los fallos de storage (Safari privado, cuotas) se tragan en
 * silencio.
 */

const STORAGE_KEY = 'paporla_last_pickup_times'

/** HH:MM estricto: lo único que aceptamos de vuelta desde localStorage. */
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

export interface RememberedPickupTimes {
  pickup_start_time: string
  pickup_end_time: string
}

export function rememberPickupTimes(startTime: string, endTime: string): void {
  if (typeof window === 'undefined') return
  if (!TIME_RE.test(startTime) || !TIME_RE.test(endTime) || startTime >= endTime) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ start: startTime, end: endTime }))
  } catch {
    /* storage lleno o bloqueado: la memoria es prescindible */
  }
}

/**
 * Devuelve la última ventana usada o null. Todo lo leído se revalida:
 * localStorage es territorio del usuario y aquí solo entran HH:MM válidos
 * con inicio < fin.
 */
export function getRememberedPickupTimes(): RememberedPickupTimes | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { start?: unknown; end?: unknown }
    const start = typeof parsed.start === 'string' ? parsed.start : ''
    const end = typeof parsed.end === 'string' ? parsed.end : ''
    if (!TIME_RE.test(start) || !TIME_RE.test(end) || start >= end) return null
    return { pickup_start_time: start, pickup_end_time: end }
  } catch {
    return null
  }
}
