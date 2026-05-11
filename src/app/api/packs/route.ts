import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET: Obtener packs (público)
export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const shopId = searchParams.get('shopId')
  const packId = searchParams.get('id')

  // Si se pide un pack específico
  if (packId) {
    const { data: pack, error } = await supabase
      .from('packs')
      .select(`
        *,
        shop:shops (
          id,
          name,
          address,
          city,
          phone,
          verified,
          description,
          logo_url
        )
      `)
      .eq('id', packId)
      .eq('is_active', true)
      .gt('remaining_stock', 0)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!pack) {
      return NextResponse.json({ error: 'Pack no encontrado' }, { status: 404 })
    }

    return NextResponse.json({ pack })
  }

  // Obtener lista de packs
  let query = supabase
    .from('packs')
    .select(`
      *,
      shop:shops (
        id,
        name,
        address,
        city,
        rating,
        verified,
        logo_url
      )
    `)
    .eq('is_active', true)
    .gt('remaining_stock', 0)

  if (shopId) {
    query = query.eq('shop_id', shopId)
  }

  const { data: packs, error } = await query.order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ packs })
}

// POST: Crear nuevo pack (solo comercio o admin)
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Verificar que el usuario es dueño del shop o admin
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'

  const body = await request.json()
  const { shop_id, title, description, price_cents, total_stock, image_url, pickup_date, pickup_start_time, pickup_end_time } = body

  if (!shop_id || !title || !price_cents || !total_stock) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  // Si no es admin, verificar que es dueño del shop
  if (!isAdmin) {
    const { data: shop } = await supabase
      .from('shops')
      .select('owner_id')
      .eq('id', shop_id)
      .maybeSingle()

    if (!shop || shop.owner_id !== user.id) {
      return NextResponse.json({ error: 'No tienes permiso para crear packs en este comercio' }, { status: 403 })
    }
  }

  const { data: pack, error } = await supabase
    .from('packs')
    .insert({
      shop_id,
      title,
      description,
      price_cents,
      total_stock,
      remaining_stock: total_stock,
      image_url,
      pickup_date,
      pickup_start_time,
      pickup_end_time,
      is_active: true,
      updated_by: user.id
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ pack }, { status: 201 })
}

// PUT: Actualizar pack
export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'

  const body = await request.json()
  const { id, ...updates } = body

  if (!id) {
    return NextResponse.json({ error: 'ID del pack requerido' }, { status: 400 })
  }

  // Verificar permisos
  if (!isAdmin) {
    const { data: pack } = await supabase
      .from('packs')
      .select('shop_id')
      .eq('id', id)
      .maybeSingle()

    if (!pack) {
      return NextResponse.json({ error: 'Pack no encontrado' }, { status: 404 })
    }

    const { data: shop } = await supabase
      .from('shops')
      .select('owner_id')
      .eq('id', pack.shop_id)
      .maybeSingle()

    if (!shop || shop.owner_id !== user.id) {
      return NextResponse.json({ error: 'No tienes permiso para actualizar este pack' }, { status: 403 })
    }
  }

  const { data: pack, error } = await supabase
    .from('packs')
    .update({ ...updates, updated_by: user.id })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ pack })
}

// DELETE: Eliminar pack (soft delete)
export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'ID del pack requerido' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'

  // Verificar permisos
  if (!isAdmin) {
    const { data: pack } = await supabase
      .from('packs')
      .select('shop_id')
      .eq('id', id)
      .maybeSingle()

    if (!pack) {
      return NextResponse.json({ error: 'Pack no encontrado' }, { status: 404 })
    }

    const { data: shop } = await supabase
      .from('shops')
      .select('owner_id')
      .eq('id', pack.shop_id)
      .maybeSingle()

    if (!shop || shop.owner_id !== user.id) {
      return NextResponse.json({ error: 'No tienes permiso para eliminar este pack' }, { status: 403 })
    }
  }

  // Soft delete
  const { error } = await supabase
    .from('packs')
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'Pack eliminado' })
}