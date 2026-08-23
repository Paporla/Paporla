/**
 * Adaptador entre la fila real de `packs` y el contrato del formulario.
 *
 * Lo usan las dos pantallas que montan PackFormSimplified con un pack ya
 * existente: editar y duplicar. Vivia duplicado en la pantalla de edicion; al
 * necesitarlo tambien duplicar se factoriza aqui, porque dos copias del mismo
 * adaptador acaban divergiendo y una de las dos se queda con un bug corregido
 * solo en la otra.
 */

/**
 * Fila completa de packs, tal y como la devuelve get_my_pack() (migracion 0023),
 * que hace to_jsonb(p) y por tanto entrega todas las columnas de la tabla.
 *
 * Nombres del esquema actual: price_minor, pickup_start_at, image_path, status.
 * No confundir con los price_cents / pickup_date / is_active del formulario,
 * que son nombres de interfaz y se traducen en toFormPack().
 */
export interface PackRow {
  id: string
  shop_id: string
  title: string
  description: string | null
  category: string
  tags: string[] | null
  price_minor: number
  original_price_minor: number | null
  total_stock: number
  remaining_stock: number
  pickup_start_at: string
  pickup_end_at: string
  sales_start_at: string | null
  image_path: string | null
  image_gallery: string[] | null
  allergen_notice: string | null
  handling_notice: string | null
  status: string
  archived_at: string | null
}

/**
 * Desfase fijo de Chile. Los packs se guardan con este offset explicito, asi
 * que se lee con el mismo para que la hora mostrada sea la que se guardo.
 * DEUDA: con mas de un mercado esto debe salir de packs.timezone_snapshot.
 */
const CHILE_OFFSET_MINUTES = -240

export function toChileDateTime(iso: string): { date: string; time: string } {
  const shifted = new Date(new Date(iso).getTime() + CHILE_OFFSET_MINUTES * 60000)
  const asIso = shifted.toISOString()
  return { date: asIso.slice(0, 10), time: asIso.slice(11, 16) }
}

/**
 * Traduce la fila de base de datos al contrato del formulario.
 *
 * Se entregan DOS campos distintos para la imagen y no es redundante:
 *   - image_url: la URL publica ya resuelta, para pintar la vista previa.
 *   - image_path: la ruta dentro del bucket, que es lo que hay que volver a
 *     guardar. Mandar la URL a la base de datos corromperia la referencia.
 *
 * category, tags, allergen_notice, handling_notice e image_gallery viajan
 * aunque el formulario apenas los muestre: update_pack_content reescribe sus 14
 * parametros de golpe, sin merge parcial, asi que lo que no se reenvie se borra.
 */
export function toFormPack(row: PackRow, imageUrl: string | null) {
  const start = toChileDateTime(row.pickup_start_at)
  const end = toChileDateTime(row.pickup_end_at)

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    price_cents: row.price_minor,
    original_price_cents: row.original_price_minor,
    total_stock: row.total_stock,
    remaining_stock: row.remaining_stock,
    pickup_date: start.date,
    pickup_start_time: start.time,
    pickup_end_time: end.time,
    starts_at: row.sales_start_at,
    ends_at: row.pickup_end_at,
    image_url: imageUrl,
    is_active: row.status === 'active',
    status: row.status,
    image_path: row.image_path,
    category: row.category,
    tags: row.tags,
    allergen_notice: row.allergen_notice,
    handling_notice: row.handling_notice,
    image_gallery: row.image_gallery,
  }
}
