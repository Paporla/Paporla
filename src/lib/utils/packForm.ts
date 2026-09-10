/**
 * Estado del formulario de packs.
 *
 * NOMENCLATURA: los campos de este modulo son nombres de INTERFAZ, no de base
 * de datos. La tabla packs usa price_minor, original_price_minor,
 * pickup_start_at, pickup_end_at, image_path y status. Aqui se mantienen
 * price_cents, pickup_date + horas sueltas, image_url e is_active porque es lo
 * que manejan los campos del formulario, que son tres controles separados
 * (fecha, hora de inicio, hora de fin) y no dos timestamps.
 *
 * La traduccion entre ambos mundos ocurre en un unico sitio,
 * buildPackContentParams(), para que no se disperse por los componentes.
 */
export interface PackFormData {
  title: string
  description: string
  price_cents: number
  original_price_cents: number
  total_stock: number
  pickup_date: string
  pickup_start_time: string
  pickup_end_time: string
  image_url: string
  is_active: boolean
}

export interface PackFormErrors {
  title?: string
  price_cents?: string
  total_stock?: string
  pickup_date?: string
  pickup_start_time?: string
  pickup_end_time?: string
  general?: string
}

/**
 * Huso horario de Chile segun el calendario IANA, NO un offset fijo.
 *
 * HISTORIA (bug +1 h, fichado el dia del cutover 2026-09-09): antes esto era
 * `CHILE_UTC_OFFSET = '-04:00'` a fuego. Chile cambia de huso dos veces al
 * ano (invierno UTC-4, verano UTC-3), asi que entre el cambio de septiembre
 * y el de abril cada hora escrita por un comercio se guardaba una hora tarde:
 * escribia 22:00 y el pack salia 23:00. La lectura ya usaba IANA
 * (formatDate.ts); la escritura era la unica que adivinaba.
 *
 * Con `America/Santiago` el propio runtime resuelve si la fecha cae en
 * horario de verano o de invierno, incluidos los dias de transicion.
 * DEUDA: cuando haya mas de un mercado, el huso debe salir de
 * shops.timezone / packs.timezone_snapshot en lugar de estar aqui fijado.
 */
const CHILE_TZ = 'America/Santiago'

/** Desglosa un instante en las partes de calendario que se ven en un huso. */
function partsInTimezone(instant: Date, timeZone: string): Record<string, number> {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const parts: Record<string, number> = {}
  for (const part of dtf.formatToParts(instant)) {
    if (part.type !== 'literal') parts[part.type] = Number(part.value)
  }
  return parts
}

/** Minutos de desfase entre UTC y el huso en un instante dado (p.ej. -180 en verano chileno). */
function timezoneOffsetMinutes(instant: Date, timeZone: string): number {
  const p = partsInTimezone(instant, timeZone)
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute, p.second)
  return Math.round((asUtc - Math.floor(instant.getTime() / 1000) * 1000) / 60000)
}

/**
 * Convierte fecha + hora del formulario (hora de pared en Chile) en un
 * instante UTC sin ambiguedad. Devuelve ISO con Z, que Postgres acepta
 * como timestamptz.
 *
 * El algoritmo tantea el offset dos veces: la primera aproximacion puede
 * caer al otro lado de un cambio de horario (p.ej. 23:30 de invierno que en
 * verano ya es el dia siguiente), y el segundo tanteo corrige el instante.
 * Si la entrada no tiene forma de fecha/hora validas, devuelve el centinela
 * 'INVALID_DATE' (NaN en cualquier motor) y el validador del formulario la
 * rechaza antes de que nada viaje a la base.
 */
export function toChileTimestamp(date: string, time: string): string {
  // Validación de formato ANTES de parsear: el parser legado de V8 se traga
  // basuras como 'T:00Z' (las convierte en 2000-01-01) y un NaN-check solo
  // no basta. 'INVALID_DATE' es NaN en cualquier motor, y el validador del
  // formulario la caza antes de que nada viaje a la RPC.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    return 'INVALID_DATE'
  }
  const wallClockAsUtc = new Date(`${date}T${time}:00Z`)
  if (Number.isNaN(wallClockAsUtc.getTime())) {
    return 'INVALID_DATE'
  }
  let offset = timezoneOffsetMinutes(wallClockAsUtc, CHILE_TZ)
  let utc = new Date(wallClockAsUtc.getTime() - offset * 60000)
  const offsetAtUtc = timezoneOffsetMinutes(utc, CHILE_TZ)
  if (offsetAtUtc !== offset) {
    offset = offsetAtUtc
    utc = new Date(wallClockAsUtc.getTime() - offset * 60000)
  }
  return utc.toISOString()
}

/**
 * Fecha (YYYY-MM-DD) en el calendario de Chile, no en UTC.
 *
 * Usar new Date().toISOString() para esto es un error silencioso: a las 21:00
 * en Chile ya es el dia siguiente en UTC, asi que "hoy" salia con la fecha de
 * manana y el preset ponia un dia de mas. Solo se notaba por la tarde-noche,
 * que es justo cuando un comercio publica los packs del dia.
 */
export function chileDateIn(days: number, from: number = Date.now()): string {
  const p = partsInTimezone(new Date(from), CHILE_TZ)
  // Date.UTC normaliza el desbordo de dias (31 + 3 -> mes siguiente) solo.
  return new Date(Date.UTC(p.year, p.month - 1, p.day + days)).toISOString().slice(0, 10)
}

/** Hora (HH:MM) actual en Chile. */
export function chileTimeNow(from: number = Date.now()): string {
  const p = partsInTimezone(new Date(from), CHILE_TZ)
  return `${String(p.hour % 24).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`
}

/**
 * Datos que no viven en PackFormData pero que publish_pack exige.
 * Se pasan aparte porque el formulario los guarda en estados sueltos.
 */
export interface PublishContext {
  /** Aviso de alergenos tal cual lo escribio el comercio. */
  allergenNotice: string
  /** Habra imagen cuando se guarde: archivo nuevo, la del pack o la del comercio. */
  hasImage: boolean
  /** shops.status. 'verified' es el unico que permite publicar. */
  shopStatus?: string | null
  /** packs.status. Solo se publica desde draft o paused. */
  packStatus?: string | null
}

/**
 * Lista lo que impide publicar, en lenguaje de comercio.
 *
 * Replica en el cliente las condiciones de publish_pack (migracion 0009) para
 * poder avisar ANTES de llamar a la RPC, que solo sabe responder con un
 * PACK_NOT_PUBLISHABLE generico sin decir cual de las seis condiciones fallo.
 *
 * Es un espejo, no la autoridad: la base de datos sigue mandando. Si algun dia
 * cambia publish_pack hay que cambiar esta funcion tambien.
 */
export function getPublishBlockers(data: PackFormData, ctx: PublishContext): string[] {
  const blockers: string[] = []

  if (ctx.shopStatus && ctx.shopStatus !== 'verified') {
    blockers.push('Tu comercio aún no está verificado.')
  }

  if (ctx.packStatus && ctx.packStatus !== 'draft' && ctx.packStatus !== 'paused') {
    blockers.push('Solo se puede publicar un pack en borrador o en pausa.')
  }

  if (!ctx.allergenNotice.trim()) {
    blockers.push('Falta el aviso de alérgenos.')
  }

  if (!ctx.hasImage) {
    blockers.push('Falta la foto del pack.')
  }

  if (data.total_stock < 1) {
    blockers.push('Necesitas al menos 1 unidad disponible.')
  }

  /*
   * La ventana de recogida debe seguir en el futuro. validatePackForm ya lo
   * comprueba, pero alli es un error de formulario y aqui un motivo por el que
   * el boton de publicar no esta disponible: son dos mensajes distintos.
   */
  if (data.pickup_date && data.pickup_start_time) {
    const start = new Date(toChileTimestamp(data.pickup_date, data.pickup_start_time))
    if (!Number.isNaN(start.getTime()) && start.getTime() <= Date.now()) {
      blockers.push('La hora de recogida ya pasó.')
    }
  }

  return blockers
}

/**
 * Valida el formulario.
 *
 * La recogida es OBLIGATORIA. Antes era opcional y ese fue el origen de los
 * packs que nacian caducados: sin fecha, pickup_start_at acababa siendo el
 * momento de creacion, el pack no aparecia en el catalogo (search_available_packs
 * exige pickup_start_at > now()) y ademas no se podia reanudar.
 *
 * La comparacion se hace contra el instante actual real, no contra medianoche:
 * un pack con recogida hoy a las 09:00 creado a las 11:00 ya es invalido, y la
 * base de datos lo rechazaria con INVALID_PICKUP_WINDOW.
 */
export function validatePackForm(data: PackFormData): PackFormErrors {
  const errors: PackFormErrors = {}

  if (!data.title.trim()) {
    errors.title = 'El titulo es requerido'
  }

  if (data.price_cents <= 0) {
    errors.price_cents = 'El precio debe ser mayor a 0'
  }

  if (data.original_price_cents > 0 && data.original_price_cents < data.price_cents) {
    errors.price_cents = 'El precio original no puede ser menor que el precio de venta'
  }

  if (data.total_stock <= 0) {
    errors.total_stock = 'El stock debe ser mayor a 0'
  }

  if (!data.pickup_date) {
    errors.pickup_date = 'La fecha de recogida es obligatoria'
  }

  if (!data.pickup_start_time) {
    errors.pickup_start_time = 'La hora de inicio es obligatoria'
  }

  if (!data.pickup_end_time) {
    errors.pickup_end_time = 'La hora de fin es obligatoria'
  }

  if (data.pickup_date && data.pickup_start_time && data.pickup_end_time) {
    if (data.pickup_start_time >= data.pickup_end_time) {
      errors.pickup_end_time = 'La hora de fin debe ser posterior a la hora de inicio'
    }

    const start = new Date(toChileTimestamp(data.pickup_date, data.pickup_start_time))

    if (Number.isNaN(start.getTime())) {
      errors.pickup_date = 'La fecha de recogida no es valida'
    } else if (start.getTime() <= Date.now()) {
      errors.pickup_start_time = 'La recogida debe empezar en el futuro'
    }
  }

  return errors
}

export function getDefaultPackData(_shopId: string): PackFormData {
  const tomorrow = chileDateIn(1)
  return {
    title: '',
    description: '',
    price_cents: 0,
    original_price_cents: 0,
    total_stock: 1,
    pickup_date: tomorrow,
    pickup_start_time: '',
    pickup_end_time: '',
    image_url: '',
    is_active: true,
  }
}

/**
 * Rellena el formulario a partir de un pack existente.
 *
 * Quien llama debe entregar los datos ya adaptados al contrato de la interfaz
 * (lo hace la pantalla de edicion en business/packs/[id]/page.tsx, que ademas
 * resuelve image_path a una URL publica del bucket).
 */
export function packToFormData(pack: {
  title: string
  description: string | null
  price_cents: number
  original_price_cents: number | null
  total_stock: number
  pickup_date: string | null
  pickup_start_time: string | null
  pickup_end_time: string | null
  image_url: string | null
  is_active: boolean
  shopLogo?: string | null
}): PackFormData {
  const tomorrow = chileDateIn(1)
  return {
    title: pack.title,
    description: pack.description ?? '',
    price_cents: pack.price_cents,
    original_price_cents: pack.original_price_cents ?? 0,
    total_stock: pack.total_stock,
    pickup_date: pack.pickup_date ?? tomorrow,
    pickup_start_time: pack.pickup_start_time?.slice(0, 5) || '',
    pickup_end_time: pack.pickup_end_time?.slice(0, 5) || '',
    image_url: pack.image_url ?? pack.shopLogo ?? '',
    is_active: pack.is_active,
  }
}

/**
 * Campos del pack que el formulario no muestra pero que las RPC exigen.
 * Se arrastran tal cual desde el pack original para que guardar una edicion
 * nunca los borre por omision.
 */
export interface PackContentExtras {
  category: string
  tags: string[]
  allergen_notice: string
  handling_notice: string
  sales_start_at: string
  image_path: string
  image_gallery: string[]
}

/** Los 14 parametros de create_pack_draft / update_pack_content, en su orden. */
export interface PackContentParams {
  p_title: string
  p_description: string
  p_category: string
  p_tags: string[]
  p_allergen_notice: string
  p_handling_notice: string
  p_price_minor: number
  p_original_price_minor: number
  p_sales_start_at: string
  p_pickup_start_at: string
  p_pickup_end_at: string
  p_image_path: string
  p_image_gallery: string[]
}

/**
 * Unico punto de traduccion entre el formulario y el contrato de la base de
 * datos. Reglas que aplica:
 *
 *  - price_cents -> price_minor. El nombre cambia; el valor es el mismo entero
 *    en la unidad minima de la moneda. En CLP no hay decimales.
 *  - Si no se indica precio original, se usa el de venta: la columna es NOT NULL
 *    en la practica para el calculo de descuento, y un 0 daria un -infinito%.
 *  - image_path viaja como RUTA del bucket, nunca como URL publica. Guardar la
 *    URL corromperia la referencia y la imagen dejaria de resolverse.
 *  - Las horas se convierten a instantes UTC con el calendario real de Chile
 *    (verano UTC-3 / invierno UTC-4, resuelto por IANA): el comercio y su
 *    cliente pueden estar en husos distintos, y la hora escrita es la hora
 *    de pared chilena, no la del navegador.
 */
export function buildPackContentParams(data: PackFormData, extras: PackContentExtras): PackContentParams {
  return {
    p_title: data.title.trim(),
    p_description: data.description.trim(),
    p_category: extras.category,
    p_tags: extras.tags,
    p_allergen_notice: extras.allergen_notice,
    p_handling_notice: extras.handling_notice,
    p_price_minor: data.price_cents,
    p_original_price_minor: data.original_price_cents > 0 ? data.original_price_cents : data.price_cents,
    p_sales_start_at: extras.sales_start_at,
    p_pickup_start_at: toChileTimestamp(data.pickup_date, data.pickup_start_time),
    p_pickup_end_at: toChileTimestamp(data.pickup_date, data.pickup_end_time),
    p_image_path: extras.image_path,
    p_image_gallery: extras.image_gallery,
  }
}
