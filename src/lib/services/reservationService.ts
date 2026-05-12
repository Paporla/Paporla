import { createClient } from '@/lib/supabase/server'

export async function getUserReservations(userId: string, shopId?: string) {
  const supabase = await createClient()
  const query = supabase
    .from('reservations')
    .select(`*,pack:packs(id,title,price_cents,image_url,pickup_date,pickup_start_time,pickup_end_time),shop:shops(id,name,address,phone,logo_url)`)

  if (shopId) {
    const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', userId).maybeSingle()
    const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'
    if (!isAdmin) {
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
  const { pack_id, shop_id, quantity = 1 } = body

  if (!pack_id || !shop_id) return { error: 'Faltan campos requeridos', status: 400 }

  const { data: pack, error: packError } = await supabase.from('packs')
    .select('price_cents, remaining_stock, title').eq('id', pack_id).maybeSingle()
  if (packError || !pack) return { error: 'Pack no encontrado', status: 404 }
  if (pack.remaining_stock < quantity) return { error: 'No hay suficiente stock', status: 400 }

  const { data: existing } = await supabase.from('reservations').select('id')
    .eq('user_id', userId).eq('pack_id', pack_id).in('status', ['pending', 'confirmed']).maybeSingle()
  if (existing) return { error: 'Ya tienes una reserva activa para este pack', status: 400 }

  const total_price_cents = pack.price_cents * quantity
  const { data: reservation, error } = await supabase.from('reservations').insert({
    user_id: userId, shop_id, pack_id, quantity, total_price_cents,
    status: 'confirmed', payment_method: 'demo', payment_status: 'completed',
    reserved_at: new Date().toISOString()
  }).select().single()

  if (error) return { error: error.message, status: 500 }

  // Email de confirmación no bloqueante
  try {
    const [{ data: userProfile }, { data: shop }] = await Promise.all([
      supabase.from('user_profiles').select('name, email').eq('id', userId).maybeSingle(),
      supabase.from('shops').select('name, owner_id').eq('id', shop_id).maybeSingle(),
    ])
    fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/email`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'reservation', email: userProfile?.email || '',
        data: { userName: userProfile?.name || 'Usuario', packTitle: pack.title,
          shopName: shop?.name || 'Comercio', pickupCode: reservation.pickup_code || 'XXXXXX',
          price: `$${(total_price_cents / 100).toFixed(2)}` }
      }),
    }).catch(err => console.error('Error sending reservation email:', err))

    // NOTIFICACION: Avisar al comercio de nueva reserva
    if (shop?.owner_id) {
      fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: shop.owner_id,
          type: 'new_reservation',
          message: `Nueva reserva de ${userProfile?.name || 'un usuario'} para "${pack.title}"`,
          reservationId: reservation.id,
        }),
      }).catch(err => console.error('Error sending notification:', err))
    }
  } catch (e) { console.error('Error preparing notifications:', e) }

  return { data: reservation, status: 201 }
}

export async function updateReservation(userId: string, body: { id: string; status: string; cancel_reason?: string }) {
  const supabase = await createClient()
  const { id, status } = body
  if (!id || !status) return { error: 'ID y status requeridos', status: 400 }

  const { data: reservation } = await supabase.from('reservations')
    .select('user_id, shop_id, status').eq('id', id).maybeSingle()
  if (!reservation) return { error: 'Reserva no encontrada', status: 404 }

  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', userId).maybeSingle()
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'
  const isOwner = reservation.user_id === userId
  const { data: shop } = await supabase.from('shops').select('owner_id').eq('id', reservation.shop_id).maybeSingle()
  const isShopOwner = shop?.owner_id === userId

  if (!isOwner && !isShopOwner && !isAdmin) return { error: 'No autorizado', status: 403 }
  if (status === 'cancelled' && !isOwner && !isAdmin) return { error: 'Solo el usuario puede cancelar', status: 403 }
  if (status === 'confirmed' && !isShopOwner && !isAdmin) return { error: 'Solo el comercio puede confirmar', status: 403 }

  const updates: any = { status }
  if (status === 'cancelled') updates.cancelled_at = new Date().toISOString()
  if (status === 'confirmed') updates.payment_status = 'paid'

  const { data: updated, error } = await supabase.from('reservations').update(updates).eq('id', id).select().single()
  if (error) return { error: error.message, status: 500 }

  // NOTIFICACION: Si cancelaron, avisar a todos
  if (status === 'cancelled' && updated) {
    const [{ data: userProfile }, { data: shop }, { data: pack }] = await Promise.all([
      supabase.from('user_profiles').select('name, email').eq('id', updated.user_id).maybeSingle(),
      supabase.from('shops').select('name, owner_id').eq('id', updated.shop_id).maybeSingle(),
      supabase.from('packs').select('title').eq('id', updated.pack_id).maybeSingle(),
    ])

    const notifications = []

    // Avisar al usuario
    notifications.push({
      userId: updated.user_id,
      type: 'cancellation',
      message: `Tu reserva para "${pack?.title || 'Pack'}" fue cancelada${body.cancel_reason ? ': ' + body.cancel_reason : ''}`,
      reservationId: id,
    })

    // Avisar al comercio (si quien cancelo NO fue el comercio)
    if (shop?.owner_id && shop.owner_id !== userId) {
      notifications.push({
        userId: shop.owner_id,
        type: 'user_cancelled',
        message: `${userProfile?.name || 'Un usuario'} cancelo su reserva para "${pack?.title || 'Pack'}"`,
        reservationId: id,
      })
    }

    // Avisar admins si es cancelacion rara
    if (body.cancel_reason === 'problema') {
      const { data: admins } = await supabase
        .from('user_profiles')
        .select('id')
        .in('role', ['admin', 'super_admin'])
      admins?.forEach(admin => {
        notifications.push({
          userId: admin.id,
          type: 'incidence',
          message: `Cancelacion con problema: ${userProfile?.name || 'Usuario'} - "${pack?.title || 'Pack'}"`,
          reservationId: id,
        })
      })
    }

    if (notifications.length > 0) {
      fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/notifications`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifications }),
      }).catch(err => console.error('Error sending cancellation notifications:', err))
    }
  }

  return { data: updated }
}
