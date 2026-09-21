/**
 * Diccionarios de presentación para estados de pack (ADMIN-2).
 *
 * Los valores son EXACTAMENTE los del CHECK `packs_status_check`
 * (0004_packs.sql): draft, active, paused, sold_out, expired, archived.
 * Consultar los check constraints antes de agregar uno nuevo (lección del
 * contexto signup, maestro 20.23).
 */

/** Estados del ciclo de vida de un pack (CHECK packs_status_check, 0004). */
export const PACK_STATUSES = ['draft', 'active', 'paused', 'sold_out', 'expired', 'archived'] as const

export type PackStatus = (typeof PACK_STATUSES)[number]

export const packStatusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: 'Borrador', className: 'bg-gray-500/10 text-gray-400' },
  active: { label: 'Activo', className: 'bg-green-500/10 text-green-400' },
  paused: { label: 'Pausado', className: 'bg-amber-500/10 text-amber-400' },
  sold_out: { label: 'Agotado', className: 'bg-purple-500/10 text-purple-400' },
  expired: { label: 'Expirado', className: 'bg-gray-500/10 text-gray-400' },
  archived: { label: 'Archivado', className: 'bg-gray-500/10 text-gray-400' },
}

/** Config de un estado desconocido: lo muestra crudo, sin inventar. */
export function getPackStatusConfig(status: string): { label: string; className: string } {
  return (
    packStatusConfig[status] ?? {
      label: status,
      className: 'bg-gray-500/10 text-gray-400',
    }
  )
}

/**
 * Acciones del interruptor admin (RPC `admin_set_pack_status`, 0055).
 * Pausar = sacar del catálogo SIN borrar (el comercio puede reactivarlo).
 * Reactivar = volver a 'active' (la RPC exige stock, ventana futura y
 * comercio verificado: mismas reglas que el comercio, 0009).
 */
export type PackAdminAction = 'pause' | 'activate'
