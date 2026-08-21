/**
 * Acciones de estado de un pack, derivadas de su estado canónico.
 *
 * Estados canónicos (esquema v0.2 §3.4):
 *   draft · active · paused · sold_out · expired · archived
 *
 * Regla crítica que el código anterior confundía:
 *   draft  → active  ⇒  RPC `publish_pack`      (exige comercio verified)
 *   paused → active  ⇒  RPC `set_pack_paused(false)`
 * No son la misma operación ni tienen las mismas validaciones.
 */

export type PackStatus = 'draft' | 'active' | 'paused' | 'sold_out' | 'expired' | 'archived'

export type PackActionKind = 'publish' | 'pause' | 'resume' | 'none'

export interface PackAction {
  kind: PackActionKind
  /** Texto del botón. */
  label: string
  /** Nombre de la RPC a invocar. `null` si no hay acción posible. */
  rpc: 'publish_pack' | 'set_pack_paused' | null
  /** Argumentos extra de la RPC (además de `p_pack_id`). */
  args: Record<string, unknown>
  /** Mensaje de éxito para el usuario. */
  successMessage: string
  /** `true` si la acción retira el pack del catálogo público. */
  isWithdrawing: boolean
}

const NO_ACTION: PackAction = {
  kind: 'none',
  label: '',
  rpc: null,
  args: {},
  successMessage: '',
  isWithdrawing: false,
}

/**
 * Devuelve la acción principal disponible según el estado actual del pack.
 * Ninguna de estas acciones es destructiva: todas son reversibles.
 */
export function getPackAction(status: string): PackAction {
  switch (status) {
    case 'draft':
      return {
        kind: 'publish',
        label: 'Publicar',
        rpc: 'publish_pack',
        args: {},
        successMessage: 'Pack publicado. Ya aparece en el catálogo.',
        isWithdrawing: false,
      }

    case 'active':
      return {
        kind: 'pause',
        label: 'Pausar',
        rpc: 'set_pack_paused',
        args: { p_paused: true },
        successMessage: 'Pack pausado. Se ha retirado del catálogo, pero no se ha borrado.',
        isWithdrawing: true,
      }

    case 'paused':
      return {
        kind: 'resume',
        label: 'Reanudar',
        rpc: 'set_pack_paused',
        args: { p_paused: false },
        successMessage: 'Pack reanudado. Vuelve a estar visible en el catálogo.',
        isWithdrawing: false,
      }

    // sold_out / expired / archived: sin acción directa desde la tarjeta.
    default:
      return NO_ACTION
  }
}

/** Motivo por el que un pack no admite acción, para mostrarlo en la interfaz. */
export function getPackActionDisabledReason(status: string): string | null {
  switch (status) {
    case 'sold_out':
      return 'Agotado. Ajusta el stock para volver a venderlo.'
    case 'expired':
      return 'Caducado. Duplícalo para crear uno nuevo.'
    case 'archived':
      return 'Archivado.'
    default:
      return null
  }
}

/** Etiqueta legible del estado. */
export function getPackStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Borrador',
    active: 'Activo',
    paused: 'Pausado',
    sold_out: 'Agotado',
    expired: 'Caducado',
    archived: 'Archivado',
  }
  return labels[status] ?? status
}
