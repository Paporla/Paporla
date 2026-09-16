/**
 * Estimación de impacto ambiental por pack rescatado.
 *
 * ⚠️ ATENCIÓN: es una ESTIMACIÓN, no una medición. Ningún pack se pesa ni se
 * mide hoy en Paporla. Si algún día se pesan de verdad, este archivo es el
 * único sitio que hay que cambiar.
 *
 * POR QUÉ EXISTE ESTE ARCHIVO: antes había DOS cifras distintas viviendo a la
 * vez en la misma aplicación — 1,2 kg/pack en el panel del usuario y 2,5
 * kg/pack en la portada (auditoría externa A-23). Cuando una app se contradice,
 * al menos una de las dos cifras está mintiendo. Ahora hay una sola.
 *
 * DE DÓNDE SALE EL 2,5: es el orden de magnitud que usa públicamente el sector
 * del rescate alimentario para una bolsa de comida rescatada (~1 kg de alimento
 * ≈ 2,5 kg de CO₂e evitados, contando producción, transporte y descomposición
 * en vertedero). Se conserva el 2,5 porque es la cifra que ya era pública en
 * la portada: reducir una afirmación pública es fácil, inflarla no.
 *
 * REVISAR: si consigues una fuente chilena concreta (SEREMI de Medio Ambiente,
 * o el peso real medio de tus packs), cámbiala AQUÍ y en ningún otro sitio.
 */
export const CO2E_KG_PER_PACK = 2.5

/**
 * Calcula los kilos de CO₂e evitados para una cantidad de packs.
 * Única forma de obtener la cifra: así ninguna pantalla puede inventar la suya.
 */
export function co2eKgForPacks(packs: number): number {
  if (!Number.isFinite(packs) || packs <= 0) return 0
  return Math.round(packs * CO2E_KG_PER_PACK)
}

// ============================================================================
// Ahorro económico (A-05)
// ============================================================================

/**
 * Datos mínimos de una reserva para calcular el ahorro.
 *
 * Antes de la migración 0050, `list_my_reservations` no devolvía ni
 * `unit_price_minor`, ni `quantity`, ni `original_price_minor`: solo
 * `total_amount_minor`. Sin el precio de venta al público no hay forma de
 * saber cuánto se ahorró, así que el panel sumaba el precio del pack y lo
 * llamaba "Ahorrado". Era gasto, no ahorro (auditoría externa A-05).
 */
export interface SavingsReservation {
  /** Importe total cobrado por la reserva, en unidad menor. */
  total_amount_minor: number
  /**
   * Precio pagado por unidad, en unidad menor (snapshot de la reserva).
   * Opcional mientras la migración 0050 no esté aplicada.
   */
  unit_price_minor?: number
  /** Unidades reservadas. Opcional por el mismo motivo. */
  quantity?: number
  /**
   * Precio de venta al público del pack, en unidad menor (LEFT JOIN a packs).
   * - `undefined` → la migración 0050 NO está aplicada: la RPC no trae el campo.
   * - `null`      → el pack no declara precio original, o ya no existe. Ahorro 0.
   */
  original_price_minor?: number | null
}

/**
 * Ahorro de UNA reserva, en unidad menor: (precio original − pagado) × unidades.
 *
 * Nunca negativo: si el pack se vendió por encima de su precio original (o el
 * comercio no declaró precio original), el ahorro es 0, no un número raro.
 * Es la MISMA fórmula que usa `community_stats` (0035) para la landing, así
 * que las dos pantallas no pueden discrepar.
 */
export function savingsMinorFor(r: SavingsReservation): number {
  // Si falta o llega rota cualquiera de las dos patas, el ahorro es
  // DESCONOCIDO, no "gratis". Poner el precio pagado a 0 daría como ahorro el
  // precio original entero: inflaría la cifra justo cuando los datos fallan.
  // Se copian a variables locales: `Number.isFinite` no es un type guard para
  // TypeScript, así que no estrecha el tipo de una propiedad opcional.
  const paid: number = r.unit_price_minor ?? Number.NaN
  const units: number = r.quantity ?? Number.NaN

  if (!Number.isFinite(paid)) return 0
  if (r.original_price_minor == null || !Number.isFinite(r.original_price_minor)) return 0

  const quantity = units > 0 ? units : 0
  return Math.max(r.original_price_minor - paid, 0) * quantity
}

export interface MoneySavedResult {
  /**
   * `true` si se pudo calcular el ahorro real (migración 0050 aplicada y la
   * RPC devuelve el precio original). `false` → hay que caer a la etiqueta
   * honesta, porque la cifra de ahorro no existe todavía.
   */
  available: boolean
  /** Ahorro real en unidad menor. 0 si `available` es false. */
  savingsMinor: number
  /** Total pagado en unidad menor. Siempre calculable. */
  paidMinor: number
}

/**
 * Ahorro total de un conjunto de reservas, en unidad menor.
 *
 * Degrada con elegancia: si ninguna reserva trae el precio original, no
 * inventa un número. Devuelve `available: false` para que la interfaz caiga a
 * una etiqueta que sí sea cierta ("Valor de tus packs") en vez de pintar un
 * $0 falso. Así el orden de despliegue no importa: puedes subir el código
 * antes o después de correr la migración 0050.
 */
export function computeMoneySaved(reservations: readonly SavingsReservation[]): MoneySavedResult {
  let paidMinor = 0
  let savingsMinor = 0
  let sawOriginalPrice = false

  for (const r of reservations) {
    if (Number.isFinite(r.total_amount_minor)) paidMinor += r.total_amount_minor
    if (r.original_price_minor !== undefined) {
      sawOriginalPrice = true
      savingsMinor += savingsMinorFor(r)
    }
  }

  // Sin reservas, $0 de ahorro es una cifra perfectamente cierta.
  const available = sawOriginalPrice || reservations.length === 0

  return {
    available,
    savingsMinor: available ? savingsMinor : 0,
    paidMinor,
  }
}
