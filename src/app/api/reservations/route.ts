import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getUserReservations, createReservation, updateReservation } from '@/lib/services/reservationService'
import { createReservationSchema, updateReservationSchema } from '@/lib/utils/validations'

async function authenticateUser() {
  const supabase = await createClient()
  // Verificar sesión primero para evitar AuthSessionMissingError
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return null
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export async function GET(request: Request) {
  const user = await authenticateUser()
  if (!user) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const shopId = searchParams.get('shopId')
  const reservationId = searchParams.get('id')

  // Si se pide una reserva específica
  if (reservationId) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('reservations')
      .select(
        '*,pack:packs(id,title,description,price_cents,image_url),shop:shops(id,name,address,phone,latitude,longitude,city),user:user_profiles(id,name,email,phone)',
      )
      .eq('id', reservationId)
      .maybeSingle()
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, reservation: data })
  }

  const result = (await getUserReservations(user.id, shopId ?? undefined)) as {
    error?: string
    status?: number
    data?: unknown
  }
  if (result.error) return NextResponse.json({ success: false, error: result.error }, { status: result.status ?? 500 })
  return NextResponse.json({ success: true, reservations: result.data })
}

export async function POST(request: Request) {
  const user = await authenticateUser()
  if (!user) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Cuerpo de solicitud inválido' }, { status: 400 })
  }

  const parsed = createReservationSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' },
      { status: 400 },
    )
  }
  const { pack_id, shop_id, quantity } = parsed.data

  const result = (await createReservation(user.id, { pack_id, shop_id, quantity })) as {
    error?: string
    status?: number
    data?: unknown
  }
  if (result.error) return NextResponse.json({ success: false, error: result.error }, { status: result.status ?? 500 })
  return NextResponse.json({ success: true, reservation: result.data }, { status: result.status ?? 201 })
}

export async function PUT(request: Request) {
  const user = await authenticateUser()
  if (!user) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Cuerpo de solicitud inválido' }, { status: 400 })
  }

  const parsed = updateReservationSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' },
      { status: 400 },
    )
  }
  const { id, status, cancel_reason, pickup_code } = parsed.data

  // Para validar pickup por código
  if (status === 'validate_pickup') {
    const supabase = await createClient()
    const { data: result, error } = await supabase.rpc('validate_pickup', {
      p_pickup_code: pickup_code ?? '',
    })
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    const rpcResult = result as { success: boolean; error?: string }
    if (!rpcResult.success) {
      return NextResponse.json({ success: false, error: rpcResult.error ?? 'Código inválido' }, { status: 400 })
    }
    return NextResponse.json({ success: true, data: rpcResult })
  }

  // Para cancelar: usar RPC cancel_reservation (reintegra stock, actualiza stats)
  if (status === 'cancelled') {
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID de reserva requerido' }, { status: 400 })
    }
    const supabase = await createClient()
    const { data: result, error } = await supabase.rpc('cancel_reservation', {
      p_reservation_id: id,
      p_cancel_reason: cancel_reason ?? null,
    })
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    const rpcResult = result as { success: boolean; error?: string; message?: string }
    if (!rpcResult.success) {
      return NextResponse.json({ success: false, error: rpcResult.error ?? 'Error al cancelar' }, { status: 400 })
    }
    return NextResponse.json({ success: true, message: rpcResult.message ?? 'Reserva cancelada' })
  }

  // Para otros cambios de estado (confirmed, etc.)
  // NOTA: 'picked_up' solo se permite vía validate_pickup RPC (ver abajo)
  const validStatuses = ['pending', 'confirmed', 'no_show']
  if (!validStatuses.includes(status ?? '')) {
    return NextResponse.json({ success: false, error: 'Status no válido' }, { status: 400 })
  }

  const result = (await updateReservation(user.id, {
    id: id!,
    status: status!,
    cancel_reason,
  })) as {
    error?: string
    status?: number
    data?: unknown
  }
  if (result.error) return NextResponse.json({ success: false, error: result.error }, { status: result.status ?? 500 })
  return NextResponse.json({ success: true, reservation: result.data })
}