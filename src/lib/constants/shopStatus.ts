/**
 * Estados canónicos de `shops.status` (0003:158, `shops_status_check`).
 * Única fuente de verdad para etiquetas y colores en el panel admin.
 */
export const SHOP_STATUSES = ['draft', 'pending_review', 'verified', 'rejected', 'suspended', 'closed'] as const

export type ShopStatusValue = (typeof SHOP_STATUSES)[number]

/**
 * Acciones de moderación que acepta `admin_review_shop` (0009:1383).
 * No hay camino canónico de «revertir» a pendiente ni de borrar un
 * comercio: el esquema no lo soporta, y la UI no ofrece acciones que la
 * base rechazaría.
 */
export const SHOP_MODERATION_ACTIONS = ['verified', 'rejected', 'suspended'] as const

export type ShopModerationAction = (typeof SHOP_MODERATION_ACTIONS)[number]

export const SHOP_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: 'Borrador', className: 'bg-gray-500/20 text-gray-400' },
  pending_review: { label: 'Pendiente de revisión', className: 'bg-amber-500/20 text-amber-400' },
  verified: { label: 'Verificado', className: 'bg-green-500/20 text-green-400' },
  rejected: { label: 'Rechazado', className: 'bg-red-500/20 text-red-400' },
  suspended: { label: 'Suspendido', className: 'bg-orange-500/20 text-orange-400' },
  closed: { label: 'Cerrado', className: 'bg-gray-700/40 text-gray-500' },
}

/** Fallback: estado desconocido se muestra tal cual, en gris (F2b: nunca inventar). */
export function getShopStatusConfig(status: string): { label: string; className: string } {
  return SHOP_STATUS_CONFIG[status] ?? { label: status, className: 'bg-gray-500/20 text-gray-400' }
}

/** Texto corto del verbo de moderación para los toasts. */
export const MODERATION_VERB: Record<ShopModerationAction, string> = {
  verified: 'verificado',
  rejected: 'rechazado',
  suspended: 'suspendido',
}
