// ============================================
// CONSTANTES COMPARTIDAS
// ============================================

export const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

export const PACK_STATUS = {
  active: { label: 'Activo', color: 'bg-green-500/20 text-green-400' },
  sold_out: { label: 'Agotado', color: 'bg-red-500/20 text-red-400' },
  expired: { label: 'Expirado', color: 'bg-gray-500/20 text-gray-400' },
} as const

// RESERVATION_STATUS consolidado en @/lib/constants/reservations.ts (STATUS_CONFIG)
