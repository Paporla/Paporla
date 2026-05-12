import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// ============================================
// Cron: Revisar reservas proximas a recoger
// Llamar cada 15-30 minutos
// ============================================

export async function GET() {
  try {
    const supabase = await createClient()
    const now = new Date()
    const nowISO = now.toISOString()

    // Buscar reservas con pickup en la proxima hora
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000)
    const oneHourLaterStr = oneHourLater.toISOString()

    // Reservas del dia de hoy que empiezan en menos de 1 hora
    const today = nowISO.split('T')[0]

    // Buscar reservas confirmed o ready_pickup para hoy
    const { data: reservations } = await supabase
      .from('reservations')
      .select('id, user_id, pickup_date, pickup_start_time, pickup_end_time, pack:packs(title), shop:shops(name)')
      .in('status', ['confirmed', 'ready_pickup'])
      .eq('pickup_date', today)
      .order('pickup_start_time', { ascending: true })

    if (!reservations || reservations.length === 0) {
      return NextResponse.json({ sent: 0, message: 'Sin reservas para hoy' })
    }

    let sentCount = 0

    for (const reservation of reservations as any[]) {
      if (!reservation.pickup_start_time) continue

      // Calcular hora de inicio
      const [hours, minutes] = reservation.pickup_start_time.split(':').map(Number)
      const pickupTime = new Date()
      pickupTime.setHours(hours, minutes, 0, 0)

      // Diferencia en minutos entre ahora y la pickup
      const diffMs = pickupTime.getTime() - now.getTime()
      const diffMinutes = Math.round(diffMs / 60000)

      // Enviar recordatorio si falta entre 15 y 60 minutos
      if (diffMinutes >= 15 && diffMinutes <= 60) {
        const packTitle = reservation.pack?.title || 'Pack'
        const shopName = reservation.shop?.name || 'Comercio'

        // Verificar si ya enviamos recordatorio para no duplicar
        const { data: existing } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', reservation.user_id)
          .eq('type', 'pickup_reminder')
          .eq('reservation_id', reservation.id)
          .gte('created_at', today + 'T00:00:00')
          .maybeSingle()

        if (existing) continue // Ya se envio

        await supabase.from('notifications').insert({
          user_id: reservation.user_id,
          type: 'pickup_reminder',
          message: `⏰ Tu reserva de "${packTitle}" en ${shopName} esta proxima a recogerse (${reservation.pickup_start_time.slice(0, 5)})`,
          reservation_id: reservation.id,
          is_read: false,
          sent_at: nowISO,
        })

        sentCount++

        // Tambien avisar al comercio
        const { data: pack } = await supabase
          .from('packs').select('shop_id').eq('id', reservation.pack_id).maybeSingle()

        if (pack) {
          const { data: shop } = await supabase
            .from('shops').select('owner_id').eq('id', pack.shop_id).maybeSingle()

          if (shop?.owner_id) {
            await supabase.from('notifications').insert({
              user_id: shop.owner_id,
              type: 'pickup_reminder',
              message: `📦 Se acerca la hora de recogida de "${packTitle}" - ${reservation.pickup_start_time?.slice(0, 5)}`,
              reservation_id: reservation.id,
              is_read: false,
              sent_at: nowISO,
            })
            sentCount++
          }
        }
      }
    }

    return NextResponse.json({ sent: sentCount, message: `${sentCount} recordatorios enviados` })
  } catch (err) {
    console.error('[PickupReminders] Error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
