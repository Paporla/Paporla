import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getUserReservations, createReservation, updateReservation } from '@/lib/services/reservationService'

async function authenticateUser() {
  const supabase = await createClient()
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

  let body: { pack_id?: string; shop_id?: string; quantity?: number; payment_method?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Cuerpo de solicitud inválido' }, { status: 400 })
  }

  if (!body.pack_id || !body.shop_id) {
    return NextResponse.json({ success: false, error: 'Faltan campos requeridos: pack_id, shop_id' }, { status: 400 })
  }

  const quantity =
    typeof body.quantity === 'number' && body.quantity > 0 && Number.isInteger(body.quantity) ? body.quantity : 1

  const result = (await createReservation(user.id, { pack_id: body.pack_id, shop_id: body.shop_id, quantity })) as {
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

  let body: { id?: string; status?: string; cancel_reason?: string; pickup_code?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Cuerpo de solicitud inválido' }, { status: 400 })
  }

  if (!body.id || !body.status) {
    return NextResponse.json({ success: false, error: 'ID y status requeridos' }, { status: 400 })
  }

  // Para validar pickup por código
  if (body.status === 'validate_pickup') {
    const supabase = await createClient()
    const { data: result, error } = await supabase.rpc('validate_pickup', {
      p_pickup_code: body.pickup_code ?? '',
    })
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    const rpcResult = result as { success: boolean; error?: string }
    if (!rpcResult.success) {
      return NextResponse.json({ success: false, error: rpcResult.error ?? 'Código inválido' }, { status: 400 })
    }
    return NextResponse.json({ success: true, data: rpcResult })
  }

  const validStatuses = ['pending', 'confirmed', 'cancelled', 'picked_up', 'no_show']
  if (!validStatuses.includes(body.status)) {
    return NextResponse.json({ success: false, error: 'Status no válido' }, { status: 400 })
  }

  const result = (await updateReservation(user.id, body as { id: string; status: string; cancel_reason?: string })) as {
    error?: string
    status?: number
    data?: unknown
  }
  if (result.error) return NextResponse.json({ success: false, error: result.error }, { status: result.status ?? 500 })
  return NextResponse.json({ success: true, reservation: result.data })
}
