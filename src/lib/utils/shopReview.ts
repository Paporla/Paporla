/**
 * Reglas de "enviar el comercio a revisión".
 *
 * La fuente de verdad es la RPC `submit_own_shop_for_review`
 * (supabase/migrations/0009_functions.sql:1343). Este módulo replica sus
 * requisitos en el navegador con un único objetivo: poder decirle al comercio
 * QUÉ le falta antes de que pulse, en vez de dejar que la base de datos le
 * devuelva un `SHOP_PROFILE_INCOMPLETE` genérico.
 *
 * OJO: el `completionPercentage` que ya se muestra en el perfil NO sirve para
 * esto. Mide otros campos (incluye `description` y `coverUrl`, que la RPC no
 * exige; y omite latitud, longitud y localidad, que sí exige). Usarlo llevaría
 * a mostrar "100% completado" y aun así fallar al enviar.
 */

/** Estados posibles de un comercio, según el CHECK de la tabla `shops`. */
export type ShopStatus = 'draft' | 'pending_review' | 'verified' | 'rejected' | 'suspended' | 'closed'

const SHOP_STATUSES: readonly string[] = ['draft', 'pending_review', 'verified', 'rejected', 'suspended', 'closed']

/**
 * Normaliza el `status` que llega de `get_my_shop`. Si viniera un valor
 * inesperado, se trata como `draft`: es el estado menos peligroso, porque
 * ofrece enviar a revisión en lugar de bloquear al comercio.
 */
export function parseShopStatus(value: unknown): ShopStatus {
  return typeof value === 'string' && SHOP_STATUSES.includes(value) ? (value as ShopStatus) : 'draft'
}

/** Estados desde los que la RPC acepta el envío. El resto lo rechaza. */
export function canSubmitForReview(status: ShopStatus): boolean {
  return status === 'draft' || status === 'rejected'
}

/**
 * Los campos que la RPC exige NOT NULL (incluye RUT y resolución sanitaria
 * desde 0038), con la etiqueta que ve el comercio y
 * la pestaña donde se rellenan (para poder llevarle allí de un clic).
 *
 * `locality_id` no aparece: el perfil lo fija siempre a Santiago
 * (SANTIAGO_LOCALITY_ID), así que nunca puede faltar desde esta pantalla.
 */
export const REQUIRED_FIELDS = [
  { key: 'name', label: 'Nombre del comercio', tab: 'info' },
  { key: 'category', label: 'Categoría', tab: 'info' },
  { key: 'phone', label: 'Teléfono', tab: 'info' },
  { key: 'address', label: 'Dirección', tab: 'info' },
  { key: 'taxId', label: 'RUT de la empresa', tab: 'info' },
  { key: 'sanitaryResolution', label: 'Resolución sanitaria', tab: 'info' },
  { key: 'latitude', label: 'Latitud', tab: 'location' },
  { key: 'longitude', label: 'Longitud', tab: 'location' },
  { key: 'logoUrl', label: 'Logo', tab: 'images' },
] as const

export interface MissingField {
  label: string
  tab: string
}

/**
 * Devuelve los campos obligatorios que siguen vacíos.
 *
 * Recibe el `formData` del perfil, es decir lo que el comercio ve en pantalla
 * ahora mismo. Se usa a propósito el formulario y no el `shop` guardado: si
 * acaba de escribir el teléfono y aún no ha guardado, el aviso debe reflejarlo.
 */
export function getMissingRequiredFields(formData: Record<string, unknown>): MissingField[] {
  return REQUIRED_FIELDS.filter(({ key }) => {
    const value = formData[key]
    if (value === null || value === undefined) return true
    return String(value).trim() === ''
  }).map(({ label, tab }) => ({ label, tab }))
}
