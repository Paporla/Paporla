import { createClient } from '@/lib/supabase/server'

export async function getPacks(packId?: string, shopId?: string) {
  const supabase = await createClient()

  if (packId) {
    const { data, error } = await supabase
      .from('packs')
      .select(`*,shop:shops(id,name,address,city,phone,verified,description,logo_url)`)
      .eq('id', packId)
      .eq('is_active', true)
      .gt('remaining_stock', 0)
      .maybeSingle()
    if (error) return { error: error.message, status: 500 }
    if (!data) return { error: 'Pack no encontrado', status: 404 }
    return { data }
  }

  const query = supabase
    .from('packs')
    .select(`*,shop:shops(id,name,address,city,rating,verified,logo_url)`)
    .eq('is_active', true)
    .gt('remaining_stock', 0)

  if (shopId) query.eq('shop_id', shopId)

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) return { error: error.message, status: 500 }
  return { data: data || [] }
}

async function getProfile(userId: string) {
  const supabase = await createClient()
  const { data } = await supabase.from('user_profiles').select('role').eq('id', userId).maybeSingle()
  return data
}

async function checkPermission(userId: string, shopId: string) {
  const profile = await getProfile(userId)
  if (profile?.role === 'admin' || profile?.role === 'super_admin') return true
  const supabase = await createClient()
  const { data: shop } = await supabase.from('shops').select('owner_id').eq('id', shopId).maybeSingle()
  return shop?.owner_id === userId
}

async function checkPackPermission(userId: string, packId: string) {
  const profile = await getProfile(userId)
  if (profile?.role === 'admin' || profile?.role === 'super_admin') return { allowed: true }

  const supabase = await createClient()
  const { data: pack } = await supabase.from('packs').select('shop_id').eq('id', packId).maybeSingle()
  if (!pack) return { allowed: false, error: { error: 'Pack no encontrado', status: 404 } }

  const { data: shop } = await supabase.from('shops').select('owner_id').eq('id', pack.shop_id).maybeSingle()
  if (!shop || shop.owner_id !== userId) return { allowed: false, error: { error: 'No tienes permiso', status: 403 } }
  return { allowed: true }
}

export async function createPack(userId: string, body: Record<string, unknown>) {
  const supabase = await createClient()
  const {
    shop_id,
    title,
    description,
    price_cents,
    total_stock,
    image_url,
    pickup_date,
    pickup_start_time,
    pickup_end_time,
  } = body as {
    shop_id?: string
    title?: string
    description?: string
    price_cents?: number
    total_stock?: number
    image_url?: string
    pickup_date?: string
    pickup_start_time?: string
    pickup_end_time?: string
  }

  if (!shop_id || !title || !price_cents || !total_stock) {
    return { error: 'Faltan campos requeridos', status: 400 }
  }

  const hasPerm = await checkPermission(userId, shop_id as string)
  if (!hasPerm) return { error: 'No tienes permiso', status: 403 }

  const { data, error } = await supabase
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
      updated_by: userId,
    })
    .select()
    .single()

  if (error) return { error: error.message, status: 500 }
  return { data, status: 201 }
}

export const ALLOWED_PACK_FIELDS = [
  'title',
  'description',
  'price_cents',
  'original_price_cents',
  'total_stock',
  'image_url',
  'image_gallery',
  'pickup_date',
  'pickup_start_time',
  'pickup_end_time',
  'tags',
  'category',
] as const

type AllowedPackField = (typeof ALLOWED_PACK_FIELDS)[number]

export async function updatePack(userId: string, body: Record<string, unknown>) {
  const supabase = await createClient()
  const { id, ...updates } = body
  if (!id) return { error: 'ID requerido', status: 400 }

  const { allowed, error: permError } = await checkPackPermission(userId, id as string)
  if (!allowed) return permError

  const filtered: Partial<Record<AllowedPackField, unknown>> = {}
  for (const key of ALLOWED_PACK_FIELDS) {
    if (key in updates) {
      filtered[key] = updates[key]
    }
  }

  const { data, error } = await supabase
    .from('packs')
    .update({ ...filtered, updated_by: userId })
    .eq('id', id)
    .select()
    .single()
  if (error) return { error: error.message, status: 500 }
  return { data }
}

export async function deletePack(userId: string, packId: string) {
  const supabase = await createClient()
  if (!packId) return { error: 'ID requerido', status: 400 }

  const { allowed, error: permError } = await checkPackPermission(userId, packId)
  if (!allowed) return permError

  const { error } = await supabase
    .from('packs')
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq('id', packId)
  if (error) return { error: error.message, status: 500 }
  return { data: { success: true } }
}
