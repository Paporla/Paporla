/**
 * Traducción de errores de la base de datos (RPC de Supabase) a español.
 *
 * Hermano de `auth-errors.ts`, para los errores que vienen de PostgREST y de
 * las funciones RPC en lugar de Supabase Auth.
 *
 * Existe por un motivo concreto: los errores de Supabase **no son instancias
 * de `Error`**. Son objetos planos `{ message, code, details, hint }`. El
 * patrón habitual
 *
 *     catch (err) { err instanceof Error ? err.message : 'Error genérico' }
 *
 * evalúa siempre a `false` con ellos, así que el mensaje real de Postgres se
 * pierde y el usuario ve un texto genérico. Depurar se vuelve imposible sin
 * abrir las DevTools.
 *
 * `translateDbError` extrae el mensaje venga como venga y, si reconoce uno de
 * nuestros códigos de error, lo traduce a algo accionable.
 */

/** Forma de un error de PostgREST / supabase-js. No es un `Error` de JS. */
interface PostgrestLikeError {
  message?: unknown
  code?: unknown
  details?: unknown
  hint?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/**
 * Saca el texto de un error, sea cual sea su forma: string, Error de JS,
 * objeto de PostgREST, o cualquier otra cosa.
 */
export function extractErrorMessage(error: unknown): string {
  if (!error) return ''
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message

  if (isRecord(error)) {
    const e = error as PostgrestLikeError
    if (typeof e.message === 'string' && e.message.trim()) return e.message
    if (typeof e.details === 'string' && e.details.trim()) return e.details
    if (typeof e.hint === 'string' && e.hint.trim()) return e.hint
    // Un objeto sin campos útiles: `String(obj)` daría "[object Object]",
    // que en pantalla es peor que no decir nada. Que decida el fallback.
    return ''
  }

  return String(error)
}

/** Devuelve el código SQLSTATE / PostgREST si el error lo trae. */
export function extractErrorCode(error: unknown): string | null {
  if (isRecord(error)) {
    const code = (error as PostgrestLikeError).code
    if (typeof code === 'string' && code.trim()) return code
  }
  return null
}

/**
 * Mensajes que lanzan nuestras funciones RPC con RAISE EXCEPTION.
 * La clave es el MESSAGE exacto del RAISE; el valor, el texto para el usuario.
 */
const RPC_MESSAGES: Record<string, string> = {
  // Perfil del comercio — update_own_shop (migraciones 0009, 0021, 0022)
  COORDINATES_MUST_COME_IN_PAIR:
    'Debes indicar la latitud y la longitud juntas, o dejar las dos vacías. Revisa que uses punto decimal (-33.4489) y no coma.',
  LATITUDE_OUT_OF_RANGE: 'La latitud debe estar entre -90 y 90.',
  LONGITUDE_OUT_OF_RANGE: 'La longitud debe estar entre -180 y 180.',
  LOCALITY_MARKET_MISMATCH: 'La ciudad seleccionada no pertenece al país de tu comercio.',
  SHOP_NOT_OWNED_OR_INACTIVE: 'No puedes editar este comercio: no es tuyo o está suspendido.',
  SHOP_PROFILE_INCOMPLETE:
    'Faltan datos obligatorios para enviar el comercio a revisión: nombre, categoría, teléfono, dirección, ubicación y logo.',
  SHOP_NOT_SUBMITTABLE: 'Este comercio no se puede enviar a revisión en su estado actual.',
  SHOP_NOT_FOUND: 'No se encontró el comercio.',

  // Permisos
  ADMIN_REQUIRED: 'Esta acción requiere permisos de administrador.',
  INVALID_REVIEW_DECISION: 'La decisión de revisión no es válida. Debes indicar un motivo de al menos 3 caracteres.',

  // Packs — publish_pack / set_pack_paused / archive_pack (migraciones 0009, 0016)
  // Invariante verificada por test: ninguna clave de este mapa es subcadena de otra.
  // La búsqueda es por inclusión, así que si alguna vez lo fuera, el orden decidiría
  // el resultado y el mensaje podría ser el equivocado.
  PACK_HAS_ACTIVE_RESERVATIONS:
    'No puedes eliminar este pack porque tiene reservas activas. Pausa el pack para que deje de venderse; podrás eliminarlo cuando se completen o cancelen.',
  PACK_NOT_AUTHORIZED: 'Este pack no pertenece a tu comercio.',
  PACK_NOT_PUBLISHABLE: 'Este pack no se puede publicar en su estado actual.',
  PACK_NOT_RESUMABLE: 'No se puede reanudar este pack. Comprueba que siga en pausa y que tu comercio esté verificado.',
  PACK_NOT_ACTIVE: 'Solo puedes pausar un pack que esté activo.',
  PACK_NOT_OWNED: 'Este pack no pertenece a tu comercio.',
  PACK_NOT_FOUND: 'No se encontró el pack.',
  SHOP_NOT_VERIFIED: 'Tu comercio aún no está verificado. No puedes publicar packs hasta que se apruebe.',

  // Sesión / cuenta
  CALLER_NOT_ACTIVE: 'Tu cuenta no está activa. Inicia sesión de nuevo.',
  RATE_LIMITED: 'Demasiados intentos. Espera unos segundos e inténtalo de nuevo.',
}

/**
 * Restricciones CHECK de la base de datos. Si una llega hasta el usuario es,
 * en rigor, un fallo de validación nuestro: deberíamos haberlo impedido antes.
 * Aun así conviene decir algo comprensible en lugar del texto de Postgres.
 */
const CONSTRAINT_MESSAGES: Record<string, string> = {
  shops_coordinates_pair_check: 'Debes indicar la latitud y la longitud juntas, o dejar las dos vacías.',
  shops_latitude_check: 'La latitud debe estar entre -90 y 90.',
  shops_longitude_check: 'La longitud debe estar entre -180 y 180.',
  shops_name_check: 'El nombre del comercio debe tener entre 2 y 160 caracteres.',
  shops_phone_e164_check: 'El teléfono debe tener formato internacional, por ejemplo +56912345678.',
  shops_website_url_check: 'La web debe empezar por https://',
  shops_instagram_handle_check: 'El usuario de Instagram solo admite letras, números, puntos y guiones bajos.',
  shops_description_check: 'La descripción no puede superar los 4000 caracteres.',
  shop_hours_time_check: 'La hora de cierre debe ser posterior a la de apertura.',
  shop_hours_weekday_check: 'Día de la semana no válido.',
  shop_hours_sequence_check: 'Solo se admiten hasta 3 tramos horarios por día.',
}

/**
 * Traduce un error de RPC / PostgREST a un mensaje en español para el usuario.
 *
 * Orden de resolución:
 *   1. MESSAGE exacto de un RAISE EXCEPTION nuestro.
 *   2. Nombre de una restricción CHECK conocida.
 *   3. Código SQLSTATE genérico.
 *   4. El mensaje original, que siempre es más útil que un texto vacío.
 */
export function translateDbError(error: unknown, fallback = 'No se pudo completar la operación.'): string {
  if (!error) return fallback

  const message = extractErrorMessage(error)
  if (!message) return fallback

  // 1. ¿Es uno de nuestros RAISE EXCEPTION?
  for (const [key, text] of Object.entries(RPC_MESSAGES)) {
    if (message.includes(key)) return text
  }

  // 2. ¿Menciona una restricción CHECK conocida?
  for (const [constraint, text] of Object.entries(CONSTRAINT_MESSAGES)) {
    if (message.includes(constraint)) return text
  }

  // 3. Códigos SQLSTATE genéricos.
  const code = extractErrorCode(error)
  switch (code) {
    case '23514':
      return `Algún dato no cumple las reglas de validación. ${message}`
    case '23505':
      return 'Ya existe un registro con esos datos.'
    case '23503':
      return 'El dato referenciado no existe.'
    case '42501':
      return 'No tienes permiso para realizar esta acción.'
    case '22023':
      return `Dato no válido. ${message}`
    case 'PGRST301':
      return 'Tu sesión ha expirado. Inicia sesión de nuevo.'
    case 'P0001':
      return message
    default:
      break
  }

  // 4. Mejor el mensaje real que uno genérico: al menos es depurable.
  return message
}
