// ============================================
// Helpers para enviar notificaciones via API
// ============================================

const API_BASE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

interface SendNotificationParams {
  userId: string
  type: string
  message: string
  reservationId?: string
}

interface SendBatchParams {
  notifications: SendNotificationParams[]
}

/**
 * Enviar una notificacion a un usuario
 */
export async function sendNotification({ userId, type, message, reservationId }: SendNotificationParams) {
  try {
    const res = await fetch(`${API_BASE}/api/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, type, message, reservationId }),
    })
    if (!res.ok) console.error('[sendNotification] Error:', await res.text())
    return res.ok
  } catch (err) {
    console.error('[sendNotification] Error:', err)
    return false
  }
}

/**
 * Enviar notificaciones a multiples usuarios
 */
export async function sendBatchNotifications(notifications: SendBatchParams['notifications']) {
  try {
    const res = await fetch(`${API_BASE}/api/notifications`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notifications }),
    })
    if (!res.ok) console.error('[sendBatchNotifications] Error:', await res.text())
    return res.ok
  } catch (err) {
    console.error('[sendBatchNotifications] Error:', err)
    return false
  }
}

/**
 * Tipos de notificaciones predefinidos
 */
export const NOTIFICATION_TYPES = {
  // Para USUARIO
  PICKUP_REMINDER: 'pickup_reminder',
  CONFIRMATION: 'confirmation',
  CANCELLATION: 'cancellation',
  SHOP_CANCELLED: 'shop_cancelled',

  // Para COMERCIO
  NEW_RESERVATION: 'new_reservation',
  USER_CANCELLED: 'user_cancelled',
  PICKUP_COMPLETED: 'pickup_completed',

  // Para ADMIN
  NEW_USER: 'new_user',
  NEW_SHOP: 'new_shop',
  INCIDENCE: 'incidence',
} as const
