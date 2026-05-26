import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { sendReservationConfirmationEmail } from '@/lib/email'
import { ROLES, isAdmin } from '@/lib/constants/roles'

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['cancelled', 'picked_up', 'no_show', 'ready_pickup'],
  ready_pickup: ['picked_up', 'no_show'],
  picked_up: ['completed'],
  cancelled: [],
  no_show: [],
  expired: [],
  completed: [],
}

export async function getUserReservations(userId: string, shopId?: string) {
  const supabase = await createClient()
  const query = supabase
    .from('reservations')
    .select(
      `*,pack:packs(id,title,price_cents,image_url,pickup_date,pickup_start_time,pickup_end_time),shop:shops(id,name,address,phone,logo_url)`,
    )

  if (shopId) {
    const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', userId).maybeSingle()
    const userIsAdmin = profile?.role ? isAdmin(profile.role) : false
    if (!userIsAdmin) {
      const { data: shop } = await supabase.from('shops').select('owner_id').eq('id', shopId).maybeSingle()
      if (!shop || shop.owner_id !== userId) return { error: 'No autorizado', status: 403 }
    }
    query.eq('shop_id', shopId)
  } else {
    query.eq('user_id', userId)
  }

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) return { error: error.message, status: 500 }
  return { data: data || [] }
}

export async function createReservation(userId: string, body: { pack_id: string; shop_id: string; quantity?: number }) {
  const supabase = await createClient()
  const { pack_id, quantity = 1 } = body

  if (!pack_id) return { error: 'Faltan campos requeridos: pack_id', status: 400 }

  const { data: rpcResult, error: rpcError } = await supabase.rpc('create_reservation_atomic', {
    p_pack_id: pack_id,
    p_quantity: quantity,
    p_payment_method: 'demo',
  })

  if (rpcError) return { error: rpcError.message, status: 500 }

  const result = rpcResult as { success: boolean; reservation_id?: string; pickup_code?: string; error?: string }

  if (!result.success) {
    return { error: result.error || 'Error al crear la reserva', status: 400 }
  }

  const { data: reservation } = await supabase
    .from('reservations')
    .select(
      '*,pack:packs(id,title,price_cents,image_url,pickup_date,pickup_start_time,pickup_end_time),shop:shops(id,name,address,phone,logo_url)',
    )
    .eq('id', result.reservation_id)
    .single()

  if (reservation) {
    notifyReservationCreated(userId, reservation).catch((err) =>
      console.error('[ReservationService] Error sending notifications:', err),
    )
  }

  return { data: reservation, status: 201 }
}

async function notifyReservationCreated(userId: string, reservation: Record<string, unknown>) {
  const supabase = getSupabaseAdmin()
  const pack = reservation.pack as { title: string } | null
  const shop = reservation.shop as { name: string; owner_id: string } | null

  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('name, email')
    .eq('id', userId)
    .maybeSingle()

  if (userProfile?.email) {
    sendReservationConfirmationEmail(userProfile.email, {
      userName: userProfile.name || 'Usuario',
      packTitle: pack?.title || 'Pack',
      shopName: shop?.name || 'Comercio',
      shopAddress: null,
      pickupCode: (reservation.pickup_code as string) || 'XXXXXX',
      pickupDate: (reservation.pickup_date as string) || null,
      pickupTime: (reservation.pickup_start_time as string) || null,
      price: `$${(((reservation.total_price_cents as number) || 0) / 100).toFixed(2)}`,
    }).catch((err) => console.error('[ReservationService] Email error:', err))
  }

  if (shop?.owner_id) {
    await supabase.from('notifications').insert({
      user_id: shop.owner_id,
      type: 'new_reservation',
      message: `Nueva reserva de ${userProfile?.name || 'un usuario'} para "${pack?.title || 'Pack'}"`,
      reservation_id: reservation.id as string,
      is_read: false,
      sent_at: new Date().toISOString(),
    })
  }
}

export async function updateReservation(userId: string, body: { id: string; status: string; cancel_reason?: string }) {
  const supabase = await createClient()
  const { id, status } = body
  if (!id || !status) return { error: 'ID y status requeridos', status: 400 }

  const { data: reservation } = await supabase
    .from('reservations')
    .select('user_id, shop_id, status')
    .eq('id', id)
    .maybeSingle()
  if (!reservation) return { error: 'Reserva no encontrada', status: 404 }

  const allowedNext = VALID_STATUS_TRANSITIONS[reservation.status]
  if (!allowedNext || !allowedNext.includes(status)) {
    return { error: `Transición de estado inválida: ${reservation.status} → ${status}`, status: 400 }
  }

  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', userId).maybeSingle()
  const userIsAdmin = profile?.role ? isAdmin(profile.role) : false
  const isOwner = reservation.user_id === userId
  const { data: shop } = await supabase.from('shops').select('owner_id').eq('id', reservation.shop_id).maybeSingle()
  const isShopOwner = shop?.owner_id === userId

  if (!isOwner && !isShopOwner && !userIsAdmin) return { error: 'No autorizado', status: 403 }
  if (status === 'cancelled' && !isOwner && !userIsAdmin)
    return { error: 'Solo el usuario puede cancelar', status: 403 }
  if (status === 'confirmed' && !isShopOwner && !userIsAdmin)
    return { error: 'Solo el comercio puede confirmar', status: 403 }

  const updates: Record<string, unknown> = { status }
  if (status === 'cancelled') updates.cancelled_at = new Date().toISOString()
  if (status === 'confirmed') updates.payment_status = 'paid'

  const { data: updated, error } = await supabase.from('reservations').update(updates).eq('id', id).select().single()
  if (error) return { error: error.message, status: 500 }

  if (status === 'cancelled' && updated) {
    notifyCancellation(userId, updated, body.cancel_reason).catch((err) =>
      console.error('[ReservationService] Error sending cancellation notifications:', err),
    )
  }

  return { data: updated }
}

async function notifyCancellation(
  userId: string,
  updated: { id: string; user_id: string; shop_id: string; pack_id: string },
  cancelReason?: string,
) {
  const supabase = getSupabaseAdmin()

  const [{ data: userProfile }, { data: shop }, { data: pack }] = await Promise.all([
    supabase.from('user_profiles').select('name, email').eq('id', updated.user_id).maybeSingle(),
    supabase.from('shops').select('name, owner_id').eq('id', updated.shop_id).maybeSingle(),
    supabase.from('packs').select('title').eq('id', updated.pack_id).maybeSingle(),
  ])

  const notifications: Array<{
    user_id: string
    type: string
    message: string
    reservation_id: string
    is_read: boolean
    sent_at: string
  }> = []

  notifications.push({
    user_id: updated.user_id,
    type: 'cancellation',
    message: `Tu reserva para "${pack?.title || 'Pack'}" fue cancelada${cancelReason ? ': ' + cancelReason : ''}`,
    reservation_id: updated.id,
    is_read: false,
    sent_at: new Date().toISOString(),
  })

  if (shop?.owner_id && shop.owner_id !== userId) {
    notifications.push({
      user_id: shop.owner_id,
      type: 'user_cancelled',
      message: `${userProfile?.name || 'Un usuario'} cancelo su reserva para "${pack?.title || 'Pack'}"`,
      reservation_id: updated.id,
      is_read: false,
      sent_at: new Date().toISOString(),
    })
  }

  if (cancelReason === 'problema') {
    const { data: admins } = await supabase
      .from('user_profiles')
      .select('id')
      .in('role', [ROLES.ADMIN, ROLES.SUPER_ADMIN])
    admins?.forEach((admin) => {
      notifications.push({
        user_id: admin.id,
        type: 'incidence',
        message: `Cancelacion con problema: ${userProfile?.name || 'Usuario'} - "${pack?.title || 'Pack'}"`,
        reservation_id: updated.id,
        is_read: false,
        sent_at: new Date().toISOString(),
      })
    })
  }

  if (notifications.length > 0) {
    const { error: notifError } = await supabase.from('notifications').insert(notifications)
    if (notifError) {
      console.error('[ReservationService] Error inserting cancellation notifications:', notifError)
    }
  }
}
