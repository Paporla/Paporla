import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET: Obtener reservas del usuario autenticado
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const shopId = searchParams.get('shopId') // Para comercios ver sus reservas

  let query = supabase
    .from('reservations')
    .select(`
      *,
      pack:packs (
        id,
        title,
        price_cents,
        image_url,
        pickup_date,
        pickup_start_time,
        pickup_end_time
      ),
      shop:shops (
        id,
        name,
        address,
        phone,
        logo_url
      )
    `)

  // Si es comercio, ver reservas de su shop
  if (shopId) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'

    if (!isAdmin) {
      const { data: shop } = await supabase
        .from('shops')
        .select('owner_id')
        .eq('id', shopId)
        .maybeSingle()

      if (!shop || shop.owner_id !== user.id) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
      }
    }

    query = query.eq('shop_id', shopId)
  } else {
    // Usuario normal ve sus propias reservas
    query = query.eq('user_id', user.id)
  }

  const { data: reservations, error } = await query.order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ reservations })
}

// POST: Crear nueva reserva
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await request.json()
  const { pack_id, shop_id, quantity = 1 } = body

  if (!pack_id || !shop_id) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  // Obtener información del pack
  const { data: pack, error: packError } = await supabase
    .from('packs')
    .select('price_cents, remaining_stock, title')
    .eq('id', pack_id)
    .maybeSingle()

  if (packError || !pack) {
    return NextResponse.json({ error: 'Pack no encontrado' }, { status: 404 })
  }

  if (pack.remaining_stock < quantity) {
    return NextResponse.json({ error: 'No hay suficiente stock' }, { status: 400 })
  }

  // Verificar que no tenga reserva activa para este pack
  const { data: existingReservation } = await supabase
    .from('reservations')
    .select('id')
    .eq('user_id', user.id)
    .eq('pack_id', pack_id)
    .in('status', ['pending', 'confirmed'])
    .maybeSingle()

  if (existingReservation) {
    return NextResponse.json({ error: 'Ya tienes una reserva activa para este pack' }, { status: 400 })
  }

  const total_price_cents = pack.price_cents * quantity

  // Crear reserva
  const { data: reservation, error } = await supabase
    .from('reservations')
    .insert({
      user_id: user.id,
      shop_id,
      pack_id,
      quantity,
      total_price_cents,
      status: 'pending',
      payment_status: 'pending',
      reserved_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

    // Actualizar stock (el trigger lo hace, pero lo hacemos manual por si acaso)
  await supabase.rpc('decrement_pack_stock', { pack_id_param: pack_id })

  // Enviar email de confirmación (no bloquear si falla)
  try {
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('name, email')
      .eq('id', user.id)
      .maybeSingle()

    const { data: shop } = await supabase
      .from('shops')
      .select('name')
      .eq('id', shop_id)
      .maybeSingle()

    const emailPayload = {
      type: 'reservation',
      email: userProfile?.email || user.email,
      data: {
        userName: userProfile?.name || 'Usuario',
        packTitle: pack.title,
        shopName: shop?.name || 'Comercio',
        pickupCode: reservation.pickup_code || 'XXXXXX',
        price: `$${(total_price_cents / 100).toFixed(2)}`,
      },
    }

    // Llamada no bloqueante - envío en background
    fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emailPayload),
    }).catch(err => console.error('Error sending reservation email:', err))
  } catch (emailErr) {
    console.error('Error preparing reservation email:', emailErr)
  }

  return NextResponse.json({ reservation }, { status: 201 })
}

// PUT: Actualizar reserva (cancelar o confirmar)
export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await request.json()
  const { id, status } = body

  if (!id || !status) {
    return NextResponse.json({ error: 'ID y status requeridos' }, { status: 400 })
  }

  // Obtener la reserva
  const { data: reservation, error: findError } = await supabase
    .from('reservations')
    .select('user_id, shop_id, status')
    .eq('id', id)
    .maybeSingle()

  if (findError || !reservation) {
    return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 })
  }

  // Verificar permisos
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'
  const isOwner = reservation.user_id === user.id
  const isShopOwner = await checkIsShopOwner(supabase, user.id, reservation.shop_id)

  if (!isOwner && !isShopOwner && !isAdmin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  // Cancelar: solo el usuario o admin
  if (status === 'cancelled' && !isOwner && !isAdmin) {
    return NextResponse.json({ error: 'Solo el usuario puede cancelar su reserva' }, { status: 403 })
  }

  // Confirmar: solo el comercio o admin
  if (status === 'confirmed' && !isShopOwner && !isAdmin) {
    return NextResponse.json({ error: 'Solo el comercio puede confirmar la reserva' }, { status: 403 })
  }

  const updates: any = { status }
  if (status === 'cancelled') {
    updates.cancelled_at = new Date().toISOString()
  }
  if (status === 'confirmed') {
    updates.payment_status = 'paid'
  }

  const { data: updated, error } = await supabase
    .from('reservations')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ reservation: updated })
}

// Función auxiliar para verificar si es dueño del shop
async function checkIsShopOwner(supabase: any, userId: string, shopId: string): Promise<boolean> {
  const { data: shop } = await supabase
    .from('shops')
    .select('owner_id')
    .eq('id', shopId)
    .maybeSingle()
  
  return shop?.owner_id === userId
}