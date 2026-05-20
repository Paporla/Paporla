import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { userId, type, message, reservationId } = body

    if (!userId || !type || !message) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    if (userId !== user.id) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'
      const isBusiness = profile?.role === 'comercio'

      if (!isAdmin && !isBusiness) {
        return NextResponse.json({ error: 'No tienes permiso' }, { status: 403 })
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
          return NextResponse.json({ error: 'No tienes acceso a esta reserva' }, { status: 403 })
        }
      }
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

export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { notifications: notifs } = body

    if (!notifs || !Array.isArray(notifs) || notifs.length === 0) {
      return NextResponse.json({ error: 'Faltan notificaciones' }, { status: 400 })
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'

    const validatedNotifs = notifs.map((n: any) => {
      if (n.userId !== user.id && !isAdmin) {
        throw new Error('No tienes permiso para crear notificaciones para otros usuarios')
      }
      return {
        user_id: n.userId,
        type: n.type,
        message: n.message,
        reservation_id: n.reservationId || null,
        is_read: false,
        sent_at: new Date().toISOString(),
      }
    })

    const { data, error } = await supabase
      .from('notifications')
      .insert(validatedNotifs)
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
