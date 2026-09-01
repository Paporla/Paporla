/**
 * Normalización indulgente del código de recogida (Lote B simplificación UX).
 *
 * El código canónico es 'P4P-' + 8 hex en mayúsculas (confirm_shop_reservation,
 * 0031:82) y validate_pickup compara su sha256 EXACTO (0009:503): cualquier
 * variación de escritura falla. Pero el escenario real es un cliente dictando
 * el código en voz alta con la tienda llena: el comercio escribe "abcd 1234",
 * "p4p-abcd-1234" o "ABCD1234" y todo eso ES el mismo código.
 *
 * Esta función acepta lo que el humano escribe y reconstruye la credencial
 * canónica: mayúsculas, sin espacios/guiones/puntos, prefijo P4P añadido si
 * falta. Como el cuerpo es hex (0-9, A-F), las letras O/I/L no existen en
 * ningún código real: si aparecen son confusiones visuales o de dictado y se
 * corrigen a 0/1/1 sin riesgo de colisión.
 *
 * Devuelve la credencial completa ('P4P-XXXXXXXX') o null si lo escrito no
 * puede ser un código (cuerpo distinto de 8 caracteres alfanuméricos).
 */

/** Longitud del cuerpo del código (8 hex, 0031:82). */
export const PICKUP_CODE_BODY_LENGTH = 8

/** Prefijo canónico que emite la base de datos. */
export const PICKUP_CODE_PREFIX = 'P4P-'

/** Confusiones seguras: O/I/L no existen en hex, así que corregirlas nunca
 *  convierte un código válido en otro distinto. */
const SAFE_CHAR_FIXES: Record<string, string> = { O: '0', I: '1', L: '1' }

export function normalizePickupCredential(raw: string): string | null {
  // 1. Mayúsculas y fuera separadores típicos de dictado/copia:
  //    espacios, guiones (también los tipográficos), puntos y bajos.
  let body = raw.toUpperCase().replace(/[\s\-–—._]/g, '')

  // 2. Prefijo P4P opcional (con o sin guion, ya eliminado arriba). El cuerpo
  //    es hex y 'P' no es hex: quitar el prefijo nunca rompe un código real.
  if (body.startsWith('P4P')) body = body.slice(3)

  // 3. Confusiones visuales/de dictado sin ambigüedad posible.
  body = body.replace(/[OIL]/g, (c) => SAFE_CHAR_FIXES[c])

  // 4. Solo puede ser un código si quedan exactamente 8 alfanuméricos.
  //    (Se acepta A-Z completo, no solo A-F: si un carácter no es hex, la
  //    RPC responderá "no encontrado", un mensaje más útil para el comercio
  //    que un botón deshabilitado sin explicación.)
  if (body.length !== PICKUP_CODE_BODY_LENGTH) return null
  if (!/^[0-9A-Z]+$/.test(body)) return null

  return PICKUP_CODE_PREFIX + body
}
