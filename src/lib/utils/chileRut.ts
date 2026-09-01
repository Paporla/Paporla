/**
 * Validación y formato del RUT chileno.
 *
 * Espejo exacto de `app_private.normalize_chile_rut` (0038): la base de datos
 * tiene la última palabra, esto existe solo para avisar al comercio MIENTRAS
 * escribe en vez de esperar al error INVALID_TAX_ID del guardado.
 *
 * Formato canónico: `NNNNNNNN-D` (sin puntos, con guion, K mayúscula).
 * El dígito verificador se comprueba con módulo 11.
 */

/** Quita puntos, espacios y guiones, y pone la K en mayúscula. */
function cleanRut(value: string): string {
  return value.replace(/[.\s-]/g, '').toUpperCase()
}

/** Calcula el dígito verificador (módulo 11) del cuerpo numérico. */
function computeDv(body: string): string {
  let sum = 0
  let factor = 2
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * factor
    factor = factor === 7 ? 2 : factor + 1
  }
  const rest = 11 - (sum % 11)
  if (rest === 11) return '0'
  if (rest === 10) return 'K'
  return String(rest)
}

/**
 * Normaliza un RUT a `NNNNNNNN-D` validando el dígito verificador.
 * Devuelve `null` si el formato o el dígito no cuadran.
 */
export function normalizeChileRut(value: string): string | null {
  const clean = cleanRut(value)
  if (!/^[0-9]{7,8}[0-9K]$/.test(clean)) return null

  const body = clean.slice(0, -1)
  const dv = clean.slice(-1)
  if (dv !== computeDv(body)) return null

  return `${body}-${dv}`
}

/** ¿Es un RUT válido (formato + dígito verificador)? */
export function isValidChileRut(value: string): boolean {
  return normalizeChileRut(value) !== null
}

/**
 * Mensaje de error para el formulario, o `null` si el valor es aceptable.
 * El vacío no es error aquí: la obligatoriedad la reporta el aviso de
 * campos faltantes (shopReview), no la validación de formato.
 */
export function getChileRutError(value: string): string | null {
  if (value.trim() === '') return null
  return isValidChileRut(value) ? null : 'RUT inválido. Revisa el número y el dígito verificador (ej: 76543210-3).'
}
