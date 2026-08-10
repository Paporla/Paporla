import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createNotificationSchema, batchNotificationSchema } from '@/lib/utils/validations'

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

    const parsed = createNotificationSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' },
        { status: 400 },
      )
    }
    const { userId, type, message, reservationId } = parsed.data

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

    const parsed = batchNotificationSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' },
        { status: 400 },
      )
    }
    const { notifications } = parsed.data

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

    for (const notif of notifications) {
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