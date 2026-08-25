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
 * Texto exacto que ve el usuario cuando la base rechaza una reserva por
 * mercado distinto (create_payment_reservation, 0009:285). Se exporta porque
 * ReserveModal lo compara para mostrar la explicación y el botón exactos
 * (ver `isMarketMismatchMessage`).
 */
export const MARKET_MISMATCH_MESSAGE =
  'Este pack pertenece a otro mercado que el tuyo. Puedes cambiar tu mercado en Mi perfil.'

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

  // Reservas — create_payment_reservation (0009:209)
  // OJO: MARKET_MISMATCH es sufijo de LOCALITY_MARKET_MISMATCH. El orden de
  // más larga a más corta (RPC_MESSAGE_KEYS_BY_LENGTH) hace que gane la clave
  // larga, igual que con PACK_NOT_OWNED vs PACK_NOT_OWNED_OR_INACTIVE.
  USER_ROLE_REQUIRED:
    'Esta acción está reservada a cuentas de usuario. Si iniciaste sesión con una cuenta de comercio, usa tu cuenta de usuario.',
  PACK_AND_IDEMPOTENCY_REQUIRED: 'Faltan datos para crear la reserva. Vuelve a intentarlo.',
  IDEMPOTENCY_KEY_CONFLICT: 'Ya existe una reserva con esos datos para otro pack. Vuelve a intentarlo.',
  MARKET_MISMATCH: MARKET_MISMATCH_MESSAGE,
  PACK_NOT_AVAILABLE:
    'Este pack no está disponible ahora mismo: puede que se agotó o que su ventana de recogida ya no esté abierta.',
  RESERVATIONS_TEMPORARILY_BLOCKED:
    'Tu cuenta no puede reservar de momento por las políticas del mercado. Escríbenos si crees que es un error.',

  // Reservas — list_my_reservations (0014:281)
  // Solo debería dispararse con un cursor a medias (created_at sin id o al
  // revés), que la API nunca envía; por si acaso el usuario ve algo humano.
  INVALID_RESERVATION_PAGE_ARGUMENTS: 'No se pudo cargar la página de reservas. Vuelve a intentarlo.',

  // Reservas — cancel_reservation (0009:366)
  // La UI ya pide el motivo antes de llamar; si aun así llega este error,
  // el texto repite la regla en vez de soltar el código del RAISE.
  CANCELLATION_REASON_REQUIRED: 'Para cancelar, indícanos un motivo (al menos 3 letras).',
  RESERVATION_NOT_FOUND: 'La reserva no existe o ya no está disponible.',
  RESERVATION_NOT_CANCELLABLE: 'Esta reserva ya no puede cancelarse.',
  NOT_AUTHORIZED_FOR_RESERVATION: 'No tienes permiso para gestionar esta reserva.',
  CANCELLATION_WINDOW_CLOSED: 'Pasó el plazo para cancelar esta reserva.',

  // Packs — publish_pack / set_pack_paused / archive_pack / update_pack_content /
  // adjust_pack_stock (migraciones 0009, 0016)
  //
  // OJO: hay claves que son prefijo de otras (PACK_NOT_OWNED vs
  // PACK_NOT_OWNED_OR_INACTIVE). La búsqueda por inclusión a secas devolvería
  // el mensaje de la más corta según el orden del objeto, que es justo el fallo
  // silencioso que este módulo existe para evitar. Por eso `translateDbError`
  // ordena las claves de más larga a más corta antes de comparar, y hay un test
  // que comprueba que las dos se traducen distinto.
  PACK_HAS_ACTIVE_RESERVATIONS:
    'No puedes eliminar este pack porque tiene reservas activas. Pausa el pack para que deje de venderse; podrás eliminarlo cuando se completen o cancelen.',
  PACK_NOT_AUTHORIZED: 'Este pack no pertenece a tu comercio.',
  PACK_NOT_PUBLISHABLE: 'Este pack no se puede publicar en su estado actual.',
  PACK_NOT_RESUMABLE: 'No se puede reanudar este pack. Comprueba que siga en pausa y que tu comercio esté verificado.',
  PACK_NOT_ACTIVE: 'Solo puedes pausar un pack que esté activo.',
  PACK_NOT_OWNED: 'Este pack no pertenece a tu comercio.',
  PACK_NOT_FOUND: 'No se encontró el pack.',
  SHOP_NOT_VERIFIED: 'Tu comercio aún no está verificado. No puedes publicar packs hasta que se apruebe.',

  // Edición de contenido — update_pack_content (0009:1477 y 0009:1546)
  // El pack existe pero no es tuyo, o el comercio está suspendido o cerrado.
  PACK_NOT_OWNED_OR_INACTIVE: 'Este pack ya no está disponible para editar. Comprueba que tu comercio siga activo.',
  PACK_MUST_BE_DRAFT_OR_PAUSED:
    'Para editar este pack, pausa primero su publicación. Mientras está activo no se puede modificar el contenido.',
  INVALID_PICKUP_WINDOW: 'La hora de fin de la recogida debe ser posterior a la de inicio.',

  // Stock — adjust_pack_stock (0009:1708 y 0009:1714)
  // El mensaje del RAISE no incluye cuántas unidades hay reservadas, así que no
  // se puede citar la cifra aquí sin inventarla. Se explica la regla y se apunta
  // a dónde mirar.
  STOCK_BELOW_COMMITTED_UNITS:
    'No puedes dejar el stock por debajo de las unidades que ya te han reservado. Revisa las reservas del pack para saber el mínimo.',
  INVALID_STOCK_CHANGE:
    'Cantidad no válida. El stock no puede ser negativo ni cambiarse en un pack caducado o archivado.',

  // Sesión / cuenta
  CALLER_NOT_ACTIVE: 'Tu cuenta no está activa. Inicia sesión de nuevo.',
  RATE_LIMITED: 'Demasiados intentos. Espera unos segundos e inténtalo de nuevo.',
}

/**
 * Claves de RPC_MESSAGES ordenadas de más larga a más corta. Se calcula una vez
 * al cargar el módulo, no en cada error.
 */
const RPC_MESSAGE_KEYS_BY_LENGTH = Object.keys(RPC_MESSAGES).sort((a, b) => b.length - a.length)

/**
 * ¿El mensaje (ya traducido) es el de choque de mercados?
 *
 * `useCreateReservation` traduce el error antes de pasarlo a la UI, así que el
 * modal solo tiene el texto en español; compararlo con el texto exacto es la
 * forma robusta de saber que el fallo fue MARKET_MISMATCH y no otro.
 */
export function isMarketMismatchMessage(message: string | null | undefined): boolean {
  return message === MARKET_MISMATCH_MESSAGE
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
  shops_website_url_check: 'La web debe empezar con https://',
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
  // De la clave más larga a la más corta: si no, 'PACK_NOT_OWNED_OR_INACTIVE'
  // encajaría con 'PACK_NOT_OWNED' y mostraría el mensaje equivocado.
  for (const key of RPC_MESSAGE_KEYS_BY_LENGTH) {
    if (message.includes(key)) return RPC_MESSAGES[key]
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
