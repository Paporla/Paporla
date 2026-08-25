/**
 * Validación de coordenadas del formulario de ubicación del comercio.
 *
 * Espeja las reglas de la base (0003:142-149) para decírselas al comercio
 * EN ESPAÑOL y ANTES de gastar el RPC:
 *   - latitud y longitud van juntas (ambas vacías o ambas con valor),
 *   - latitud entre -90 y 90 (shops_latitude_check),
 *   - longitud entre -180 y 180 (shops_longitude_check).
 *
 * Sin esto, tipear por ejemplo latitud 999 o dejar una sola vacía cae en
 * el RPC con un error feo de Postgres (violación de CHECK) en vez de un
 * mensaje claro que diga por qué no se puede guardar (F2b).
 *
 * Lo que NO puede detectar: un signo mal tipeado (33.4489 en vez de
 * -33.4489 es una latitud "válida" de otra ciudad). Para eso el formulario
 * muestra la vista previa del punto con "Abrir en Maps": si el pin cae en
 * el mar, el comercio lo ve antes de guardar.
 */

export interface CoordinateValidation {
  ok: boolean
  error: string | null
}

/**
 * Convierte el texto del input a número.
 * '' → null (coordenada ausente, no es error) y texto no numérico → null.
 */
export function parseCoordinate(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
}

/**
 * Valida el par latitud/longitud tal como está en el formulario (strings).
 * Mismas reglas que los CHECK de la base, pero con mensaje en español.
 */
export function validateCoordinatePair(latitude: string, longitude: string): CoordinateValidation {
  const latEmpty = latitude.trim() === ''
  const lngEmpty = longitude.trim() === ''

  if (latEmpty && lngEmpty) return { ok: true, error: null }
  if (latEmpty !== lngEmpty) {
    return { ok: false, error: 'La latitud y la longitud van juntas: completa las dos o déjalas vacías las dos.' }
  }

  const lat = parseCoordinate(latitude)
  const lng = parseCoordinate(longitude)
  if (lat === null) return { ok: false, error: 'La latitud debe ser un número, por ejemplo -33.4489.' }
  if (lng === null) return { ok: false, error: 'La longitud debe ser un número, por ejemplo -70.6693.' }
  if (lat < -90 || lat > 90) return { ok: false, error: 'La latitud debe estar entre -90 y 90.' }
  if (lng < -180 || lng > 180) return { ok: false, error: 'La longitud debe estar entre -180 y 180.' }

  return { ok: true, error: null }
}
