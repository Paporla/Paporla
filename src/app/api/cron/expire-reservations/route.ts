// ============================================
// API ROUTE: Auto-expirado de reservas + recordatorios
// ============================================
// Ejecutar cada hora via Vercel Cron
// GET /api/cron/expire-reservations
// ============================================

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { sendPickupReminderEmail } from '@/lib/email'

function validateRequest(request: Request): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  // Si no hay CRON_SECRET configurado, permitir todas las requests
  // (usar solo con cron-job.org o similar)
  if (!cronSecret) return true
  return authHeader === 'Bearer ' + cronSecret
}

export async function GET(request: Request) {
  try {
    if (!validateRequest(request)) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const results: string[] = []

    // ============================
    // 1. Expiracion automatica
    // ============================
    const { data: expired, error: expireError } = await supabase.rpc('expire_reservations')
    if (expireError) throw expireError
    const expiredCount = expired || 0
    results.push(expiredCount + ' reservas expiradas')

    // ============================
    // 2. Recordatorios para recoger manana
    // ============================
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowDate = tomorrow.toISOString().split('T')[0]
    const tomorrowFormatted = tomorrow.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })

    const { data: upcoming } = await supabase
      .from('reservations')
      .select(`
        id,
        user_id,
        pickup_code,
        total_price_cents,
        quantity,
        pickup_start_time,
        pickup_end_time,
        pack:packs!pack_id (id, title, image_url),
        shop:shops!shop_id (id, name, address)
      `)
      .eq('status', 'confirmed')
      .eq('pickup_date', tomorrowDate)

    if (upcoming && upcoming.length > 0) {
      let remindersSent = 0

      for (const reservation of upcoming) {
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('email, name')
          .eq('id', reservation.user_id)
          .maybeSingle()

        if (!userProfile?.email) continue

        const packItem = Array.isArray(reservation.pack) ? reservation.pack[0] : reservation.pack
        const shopItem = Array.isArray(reservation.shop) ? reservation.shop[0] : reservation.shop

        const pickupTime = reservation.pickup_start_time
          ? (reservation.pickup_start_time.slice(0, 5) +
             (reservation.pickup_end_time ? ' - ' + reservation.pickup_end_time.slice(0, 5) : ''))
          : null

        const reminderResult = await sendPickupReminderEmail(userProfile.email, {
          userName: userProfile.name || 'Usuario',
          packTitle: packItem?.title || 'Pack',
          shopName: shopItem?.name || 'Comercio',
          shopAddress: shopItem?.address || null,
          pickupCode: reservation.pickup_code || 'XXXXXX',
          pickupDate: tomorrowFormatted,
          pickupTime: pickupTime,
        })

        if (reminderResult.success) remindersSent++
      }

      results.push(remindersSent + ' recordatorios enviados')
    }

    console.log('[CRON] Resultados:', results.join(' | '))

    return NextResponse.json({
      success: true,
      expired: expiredCount,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[CRON] Error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    )
  }
}
