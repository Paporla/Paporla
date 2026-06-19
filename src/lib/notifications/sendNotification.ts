import { getSupabaseAdmin } from '@/lib/supabase/admin'

interface SendNotificationParams {
  userId: string
  type: string
  message: string
  reservationId?: string
}

export async function sendNotification({ userId, type, message, reservationId }: SendNotificationParams) {
  try {
    const supabase = getSupabaseAdmin()
    const { error } = await supabase.from('notifications').insert({
      user_id: userId,
      type,
      message,
      reservation_id: reservationId ?? null,
      is_read: false,
      sent_at: new Date().toISOString(),
    })
    if (error) {
      console.error('[sendNotification] Error:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.error('[sendNotification] Error:', err)
    return false
  }
}

export async function sendBatchNotifications(notifications: SendNotificationParams[]) {
  try {
    const supabase = getSupabaseAdmin()
    const records = notifications.map((n) => ({
      user_id: n.userId,
      type: n.type,
      message: n.message,
      reservation_id: n.reservationId ?? null,
      is_read: false,
      sent_at: new Date().toISOString(),
    }))
    const { error } = await supabase.from('notifications').insert(records)
    if (error) {
      console.error('[sendBatchNotifications] Error:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.error('[sendBatchNotifications] Error:', err)
    return false
  }
}

export const NOTIFICATION_TYPES = {
  PICKUP_REMINDER: 'pickup_reminder',
  CONFIRMATION: 'confirmation',
  CANCELLATION: 'cancellation',
  SHOP_CANCELLED: 'shop_cancelled',
  NEW_RESERVATION: 'new_reservation',
  USER_CANCELLED: 'user_cancelled',
  PICKUP_COMPLETED: 'pickup_completed',
  NEW_USER: 'new_user',
  NEW_SHOP: 'new_shop',
  INCIDENCE: 'incidence',
} as const
