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
