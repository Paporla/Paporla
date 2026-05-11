// ============================================
// CONSTANTES COMPARTIDAS
// ============================================

export const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export const PACK_STATUS = {
  active: { label: 'Activo', color: 'bg-green-500/20 text-green-400' },
  sold_out: { label: 'Agotado', color: 'bg-red-500/20 text-red-400' },
  expired: { label: 'Expirado', color: 'bg-gray-500/20 text-gray-400' },
} as const;

export const RESERVATION_STATUS = {
  pending: { label: 'Pendiente', color: 'text-yellow-400 bg-yellow-500/20' },
  confirmed: { label: 'Confirmada', color: 'text-blue-400 bg-blue-500/20' },
  ready_pickup: { label: 'Lista para recoger', color: 'text-primary bg-primary/20' },
  picked_up: { label: 'Recogido', color: 'text-green-400 bg-green-500/20' },
  completed: { label: 'Completado', color: 'text-green-400 bg-green-500/20' },
  expired: { label: 'Expirada', color: 'text-orange-400 bg-orange-500/20' },
  cancelled: { label: 'Cancelada', color: 'text-red-400 bg-red-500/20' },
  refunded: { label: 'Reembolsado', color: 'text-purple-400 bg-purple-500/20' },
  no_show: { label: 'No retirada', color: 'text-gray-400 bg-gray-500/20' },
} as const;
