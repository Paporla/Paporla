import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { isAdmin } from '@/lib/constants/roles'
import { banShopSchema } from '@/lib/utils/validations'

/**
 * PATCH /api/admin/shops/[id]/ban
 * Banea o desbanea un comercio. Solo admin/super_admin.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: shopId } = await params
  const supabase = await createClient()

  // 1. Verificar autenticación y rol
  const {
    data: { user: caller },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !caller) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  }

  const { data: callerProfile } = await supabase.from('user_profiles').select('role').eq('id', caller.id).maybeSingle()

  if (!callerProfile || !isAdmin(callerProfile.role)) {
    return NextResponse.json({ success: false, error: 'Permisos insuficientes' }, { status: 403 })
  }

  // 2. Parsear y validar body
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Cuerpo inválido' }, { status: 400 })
  }

  const parsed = banShopSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' },
      { status: 400 },
    )
  }
  const { banned } = parsed.data

  // 3. Verificar que el comercio existe
  const { data: shop } = await supabase.from('shops').select('name').eq('id', shopId).maybeSingle()

  if (!shop) {
    return NextResponse.json({ success: false, error: 'Comercio no encontrado' }, { status: 404 })
  }

  // 4. Actualizar
  const { error: updateError } = await supabase.from('shops').update({ banned }).eq('id', shopId)

  if (updateError) {
    console.error('[AdminShopBan] Error:', updateError)
    return NextResponse.json({ success: false, error: 'Error al actualizar comercio' }, { status: 500 })
  }

  // 5. Registrar
  await supabase.from('activity_logs').insert({
    type: 'shop_banned',
    severity: banned ? 'warning' : 'info',
    title: banned ? 'Comercio baneado' : 'Ban removido',
    description: `Admin ${caller.email} ${banned ? 'baneó' : 'desbaneó'} el comercio "${shop.name}"`,
    shop_id: shopId,
    metadata: { changed_by: caller.id, banned },
  })

  return NextResponse.json({ success: true, data: { shopId, banned } })
}
