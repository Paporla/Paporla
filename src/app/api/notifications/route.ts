import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// ============================================
// POST /api/notifications - Crear notificacion
// ============================================
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { userId, type, message, reservationId } = body

    if (!userId || !type || !message) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        message,
        reservation_id: reservationId || null,
        is_read: false,
        sent_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('[Notifications] Error creating:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('[Notifications] Error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// ============================================
// POST /api/notifications/batch - Notificacion multiple
// ============================================
export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { notifications: notifs } = body

    if (!notifs || !Array.isArray(notifs) || notifs.length === 0) {
      return NextResponse.json({ error: 'Faltan notificaciones' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert(notifs.map((n: any) => ({
        user_id: n.userId,
        type: n.type,
        message: n.message,
        reservation_id: n.reservationId || null,
        is_read: false,
        sent_at: new Date().toISOString(),
      })))
      .select()

    if (error) {
      console.error('[Notifications] Batch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('[Notifications] Batch error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
