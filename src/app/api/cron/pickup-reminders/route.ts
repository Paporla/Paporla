import { NextResponse } from 'next/server'
import { getSupabaseAdmin, validateCronRequest } from '@/lib/supabase/admin'
import { sendPickupReminderEmail } from '@/lib/email'

export async function GET(request: Request) {
  if (!validateCronRequest(request)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  }

  try {
    const supabase = getSupabaseAdmin()

    const now = new Date()
    const today = now.toISOString().split('T')[0]

    const { data: reservations } = await supabase
      .from('reservations')
      .select(
        `
        id,
        user_id,
        pickup_date,
        pickup_start_time,
        pickup_end_time,
        pack_id,
        pickup_code,
        pack:packs(title, shop_id),
        shop:shops(name, address, owner_id)
      `,
      )
      .in('status', ['confirmed', 'ready_pickup'])
      .eq('pickup_date', today)
      .order('pickup_start_time', { ascending: true })

    if (!reservations || reservations.length === 0) {
      return NextResponse.json({ sent: 0, emailsSent: 0, message: 'Sin reservas para hoy' })
    }

    let notificationCount = 0
    let emailCount = 0

    for (const reservation of reservations) {
      if (!reservation.pickup_start_time) continue

      const [hours, minutes] = reservation.pickup_start_time.split(':').map(Number)
      const pickupTime = new Date()
      pickupTime.setHours(hours, minutes, 0, 0)

      const diffMs = pickupTime.getTime() - now.getTime()
      const diffMinutes = Math.round(diffMs / 60000)

      if (diffMinutes >= 15 && diffMinutes <= 60) {
        const packData = reservation.pack as { title?: string; shop_id?: string } | null
        const shopData = reservation.shop as { name?: string; address?: string; owner_id?: string } | null
        const packTitle = packData?.title ?? 'Pack'
        const shopName = shopData?.name ?? 'Comercio'
        const shopAddress = shopData?.address ?? null
        const userId = reservation.user_id
        const reservationId = reservation.id
        const pickupTimeStr = reservation.pickup_start_time ?? '00:00'

        const { data: existing } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', userId)
          .eq('type', 'pickup_reminder')
          .eq('reservation_id', reservationId)
          .gte('created_at', `${today}T00:00:00`)
          .maybeSingle()

        if (!existing) {
          await supabase.from('notifications').insert({
            user_id: userId,
            type: 'pickup_reminder',
            message: `Tu reserva de "${packTitle}" en ${shopName} esta proxima a recogerse (${pickupTimeStr.slice(0, 5)})`,
            reservation_id: reservationId,
            is_read: false,
            sent_at: now.toISOString(),
          })
          notificationCount++
        }

        const { data: userEmail } = await supabase
          .from('user_profiles')
          .select('email, name')
          .eq('id', userId)
          .maybeSingle()

        if (userEmail?.email) {
          await sendPickupReminderEmail(userEmail.email, {
            userName: userEmail.name ?? 'Usuario',
            packTitle,
            shopName,
            shopAddress,
            pickupCode: reservation.pickup_code ?? 'N/A',
            pickupDate: reservation.pickup_date ?? today,
            pickupTime: pickupTimeStr,
          })
          emailCount++
        }

        const ownerId = shopData?.owner_id
        if (ownerId) {
          const { data: existingShopNotif } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', ownerId)
            .eq('type', 'pickup_reminder')
            .eq('reservation_id', reservationId)
            .gte('created_at', `${today}T00:00:00`)
            .maybeSingle()

          if (!existingShopNotif) {
            await supabase.from('notifications').insert({
              user_id: ownerId,
              type: 'pickup_reminder',
              message: `Se acerca la hora de recogida de "${packTitle}" - ${pickupTimeStr.slice(0, 5)}`,
              reservation_id: reservationId,
              is_read: false,
              sent_at: now.toISOString(),
            })
            notificationCount++
          }
        }
      }
    }

    return NextResponse.json({
      sent: notificationCount,
      emailsSent: emailCount,
      message: `${notificationCount} recordatorios y ${emailCount} emails enviados`,
    })
  } catch (err) {
    console.error('[PickupReminders] Error:', err)
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 })
  }
}
