import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const VALID_NOTIFICATION_TYPES = [
  'pickup_reminder',
  'cancellation',
  'confirmation',
  'new_pack',
  'shop_verified',
  'new_reservation',
  'user_cancelled',
  'pickup_completed',
  'new_user',
  'new_shop',
  'incidence',
  'reservation_expired',
  'pack_sold_out',
] as const

const MAX_MESSAGE_LENGTH = 500

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
    }

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ success: false, error: 'Cuerpo de solicitud inválido' }, { status: 400 })
    }

    const { userId, type, message, reservationId } = body as {
      userId?: string
      type?: string
      message?: string
      reservationId?: string
    }

    if (!userId || !type || !message) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos requeridos: userId, type, message' },
        { status: 400 },
      )
    }

    if (!isValidUUID(userId)) {
      return NextResponse.json({ success: false, error: 'userId inválido' }, { status: 400 })
    }

    if (!VALID_NOTIFICATION_TYPES.includes(type as (typeof VALID_NOTIFICATION_TYPES)[number])) {
      return NextResponse.json({ success: false, error: 'Tipo de notificación no válido' }, { status: 400 })
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { success: false, error: `El mensaje no puede exceder ${MAX_MESSAGE_LENGTH} caracteres` },
        { status: 400 },
      )
    }

    if (reservationId && !isValidUUID(reservationId)) {
      return NextResponse.json({ success: false, error: 'reservationId inválido' }, { status: 400 })
    }

    if (userId !== user.id) {
      const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).maybeSingle()

      const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'
      const isBusiness = profile?.role === 'comercio'

      if (!isAdmin && !isBusiness) {
        return NextResponse.json({ success: false, error: 'No tienes permiso' }, { status: 403 })
      }

      if (isBusiness && reservationId) {
        const { data: reservation } = await supabase
          .from('reservations')
          .select('shop_id')
          .eq('id', reservationId)
          .maybeSingle()

        const { data: shop } = await supabase
          .from('shops')
          .select('id')
          .eq('id', reservation?.shop_id)
          .eq('owner_id', user.id)
          .maybeSingle()

        if (!shop) {
          return NextResponse.json({ success: false, error: 'No tienes acceso a esta reserva' }, { status: 403 })
        }
      }
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        message,
        reservation_id: reservationId ?? null,
        is_read: false,
        sent_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('[Notifications] Error creating:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err: unknown) {
    console.error('[Notifications] Error:', err)
    const message = err instanceof Error ? err.message : 'Error interno'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
    }

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ success: false, error: 'Cuerpo de solicitud inválido' }, { status: 400 })
    }

    const { notifications: notifs } = body as { notifications?: unknown[] }

    if (!notifs || !Array.isArray(notifs) || notifs.length === 0) {
      return NextResponse.json({ success: false, error: 'Faltan notificaciones' }, { status: 400 })
    }

    const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).maybeSingle()

    const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'

    const validatedNotifs: Array<{
      user_id: string
      type: string
      message: string
      reservation_id: string | null
      is_read: boolean
      sent_at: string
    }> = []

    for (const n of notifs) {
      const notif = n as { userId?: string; type?: string; message?: string; reservationId?: string }

      if (!notif.userId || !isValidUUID(notif.userId)) {
        return NextResponse.json(
          { success: false, error: 'userId inválido en una de las notificaciones' },
          { status: 400 },
        )
      }

      if (!notif.type || !VALID_NOTIFICATION_TYPES.includes(notif.type as (typeof VALID_NOTIFICATION_TYPES)[number])) {
        return NextResponse.json({ success: false, error: 'Tipo de notificación no válido' }, { status: 400 })
      }

      if (!notif.message || notif.message.length > MAX_MESSAGE_LENGTH) {
        return NextResponse.json(
          { success: false, error: `Mensaje inválido o demasiado largo (máx ${MAX_MESSAGE_LENGTH} caracteres)` },
          { status: 400 },
        )
      }

      if (notif.userId !== user.id && !isAdmin) {
        return NextResponse.json(
          { success: false, error: 'No tienes permiso para crear notificaciones para otros usuarios' },
          { status: 403 },
        )
      }

      validatedNotifs.push({
        user_id: notif.userId,
        type: notif.type,
        message: notif.message,
        reservation_id: notif.reservationId ?? null,
        is_read: false,
        sent_at: new Date().toISOString(),
      })
    }

    const { data, error } = await supabase.from('notifications').insert(validatedNotifs).select()

    if (error) {
      console.error('[Notifications] Batch error:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err: unknown) {
    console.error('[Notifications] Batch error:', err)
    const message = err instanceof Error ? err.message : 'Error interno'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
