/**
 * Comisión de plataforma — estado PROVISIONAL (L-11, 2026-09-10).
 *
 * HISTORIA: el fundador reportó que los ingresos del comercio muestran el
 * monto bruto del pack y él tendría que restar la comisión de cabeza. La
 * regla de la casa es que la app diga la verdad del dinero: Total / Comisión
 * / Recibes.
 *
 * Hoy NO existe comisión en el esquema de la base de datos: la liquidación
 * real llega con el módulo de pagos (bloqueado hasta empresa + cuenta
 * MercadoPago). Las stats de admin (migraciones 0032/0033) ya asumían un 10%
 * provisional para display; esta constante es la MISMA fuente de verdad para
 * el lado del comercio, para que ambos paneles digan siempre lo mismo.
 *
 * Cuando llegue el módulo de pagos, el porcentaje pasará a configuración por
 * mercado (tabla markets o settings) y este archivo se retira o se adapta.
 */

/** Comisión provisional en puntos base: 1000 bps = 10%. */
export const PROVISIONAL_COMMISSION_BPS = 1000

export interface CommissionSplit {
  /** Lo que pagó el cliente, en la unidad menor de la moneda (CLP: pesos). */
  grossMinor: number
  /** Lo que se queda la plataforma (redondeado hacia ABAJO: nunca se cobra de más). */
  commissionMinor: number
  /** Lo que recibe el comercio: gross - commission, sin descuadres de un peso. */
  netMinor: number
}

/**
 * Reparte un monto bruto entre plataforma y comercio.
 *
 * Aritmética entera a propósito: la comisión se redondea hacia abajo y el
 * neto es la resta exacta, así commission + net === gross SIEMPRE (ni un
 * peso fantasma). Entradas raras (NaN, negativos) se sanean a 0: una tarjeta
 * de ingresos nunca debería mostrar basura.
 */
export function computeCommissionSplit(grossMinor: number, bps: number = PROVISIONAL_COMMISSION_BPS): CommissionSplit {
  const gross = Number.isFinite(grossMinor) && grossMinor > 0 ? Math.floor(grossMinor) : 0
  const safeBps = Number.isFinite(bps) && bps >= 0 && bps <= 10000 ? bps : PROVISIONAL_COMMISSION_BPS
  const commissionMinor = Math.floor((gross * safeBps) / 10000)
  return {
    grossMinor: gross,
    commissionMinor,
    netMinor: gross - commissionMinor,
  }
}
