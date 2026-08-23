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
 * Desfase fijo de Chile. Los packs se crean y se leen con este offset.
 * DEUDA: cuando haya mas de un mercado debe salir de shops.timezone /
 * packs.timezone_snapshot en lugar de estar aqui fijado.
 */
export const CHILE_UTC_OFFSET = '-04:00'

/** Convierte fecha + hora del formulario en un timestamptz con zona explicita. */
export function toChileTimestamp(date: string, time: string): string {
  return `${date}T${time}:00${CHILE_UTC_OFFSET}`
}

const CHILE_OFFSET_MINUTES = -240

/**
 * Fecha (YYYY-MM-DD) en el calendario de Chile, no en UTC.
 *
 * Usar new Date().toISOString() para esto es un error silencioso: a las 21:00
 * en Chile ya es el dia siguiente en UTC, asi que "hoy" salia con la fecha de
 * manana y el preset ponia un dia de mas. Solo se notaba por la tarde-noche,
 * que es justo cuando un comercio publica los packs del dia.
 */
export function chileDateIn(days: number, from: number = Date.now()): string {
  const shifted = new Date(from + CHILE_OFFSET_MINUTES * 60000 + days * 86400000)
  return shifted.toISOString().slice(0, 10)
}

/** Hora (HH:MM) actual en Chile. */
export function chileTimeNow(from: number = Date.now()): string {
  const shifted = new Date(from + CHILE_OFFSET_MINUTES * 60000)
  return shifted.toISOString().slice(11, 16)
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
 *  - Las horas se envian con el offset de Chile explicito, no en hora local del
 *    navegador: el comercio y su cliente pueden estar en husos distintos.
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
