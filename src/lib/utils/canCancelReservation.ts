/**
 * Verifica si una reserva puede ser cancelada según el tiempo restante
 * antes de la fecha/hora de recogida.
 *
 * Regla: Solo se puede cancelar si faltan al menos 2 horas
 * para la fecha y hora de recogida.
 */

export function canCancelReservation(reservation: {
  status: string
  pickup_date: string | null
  pickup_start_time: string | null
}): { allowed: boolean; reason?: string } {
  // Solo se pueden cancelar reservas pendientes o confirmadas
  if (!['pending', 'confirmed'].includes(reservation.status)) {
    return { allowed: false, reason: 'Esta reserva ya no puede ser cancelada' }
  }

  // Si no tiene fecha de recogida, permitir cancelación
  if (!reservation.pickup_date) {
    return { allowed: true }
  }

  const now = new Date()

  // Construir la fecha y hora de recogida
  const pickupDate = new Date(reservation.pickup_date)

  if (reservation.pickup_start_time) {
    const [hours, minutes] = reservation.pickup_start_time.split(':').map(Number)
    pickupDate.setHours(hours, minutes, 0, 0)
  } else {
    // Si no hay hora de inicio, usar el final del día
    pickupDate.setHours(23, 59, 59, 0)
  }

  // Calcular la diferencia en milisegundos
  const diffMs = pickupDate.getTime() - now.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)

  if (diffHours < 2) {
    return {
      allowed: false,
      reason: `La reserva vence en menos de 2 horas (${Math.max(0, Math.floor(diffHours * 60))} min restantes). Ya no puedes cancelarla.`,
    }
  }

  return { allowed: true }
}
