/**
 * Formatea un precio en centavos a string con símbolo de moneda.
 *
 * @param price - Precio en centavos (ej: 1500 = $15.00)
 * @param locale - Locale BCP 47 (por defecto 'es-AR'). Usar 'en-US' para USD, 'es-MX' para MXN.
 * @param currency - Código ISO 4217 (por defecto 'ARS'). Usar 'USD' o 'MXN' según necesidad.
 * @returns Precio formateado con símbolo de moneda (ej: "$15.000,00" para ARS)
 */
export const formatPrice = (
  price: number | null | undefined,
  locale: string = 'es-AR',
  currency: string = 'ARS',
): string => {
  if (price === null || price === undefined) return formatCents(0, locale, currency)
  return formatCents(price, locale, currency)
}

/**
 * Formatea importes canónicos guardados en la unidad menor de su moneda.
 * No todas las monedas usan dos decimales: CLP usa 0; ARS/COP usan 2.
 */
export function formatMinorPrice(
  amountMinor: number | null | undefined,
  currency: string,
  locale: string = 'es-419',
): string {
  const value = amountMinor ?? 0
  try {
    const formatter = new Intl.NumberFormat(locale, { style: 'currency', currency })
    const fractionDigits = formatter.resolvedOptions().maximumFractionDigits ?? 2
    return formatter.format(value / 10 ** fractionDigits)
  } catch {
    return `${currency} ${value}`
  }
}

function formatCents(cents: number, locale: string, currency: string): string {
  const amount = cents / 100
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount)
  } catch {
    // Fallback: si locale/currency no es soportado, usar formato simple
    return `${currency} ${amount.toFixed(2)}`
  }
}

/**
 * Formatea importes en pesos chilenos (unidad menor = peso, sin decimales)
 * de forma DETERMINISTA: "$3.990" en cualquier máquina.
 *
 * Por qué existe: `toLocaleString()` sin locale depende de la ICU del
 * dispositivo — el separador de miles varía entre navegadores, nodos e
 * incluso versiones (5,490 / 5.490 / 5 490). En el piloto el único mercado
 * es Chile, así que el panel del comercio pinta SIEMPRE el mismo formato.
 */
export const formatChilePesos = (amountMinor: number | null | undefined): string => {
  const value = Math.round(amountMinor ?? 0)
  const digits = Math.abs(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${value < 0 ? '-' : ''}$${digits}`
}
