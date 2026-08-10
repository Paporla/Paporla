import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { isAdmin } from '@/lib/constants/roles'

/**
 * DELETE /api/admin/shops/[id]
 * Elimina un comercio y todos sus packs. Solo admin/super_admin.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { data: callerProfile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', caller.id)
    .maybeSingle()

  if (!callerProfile || !isAdmin(callerProfile.role)) {
    return NextResponse.json({ success: false, error: 'Permisos insuficientes' }, { status: 403 })
  }

  // 2. Verificar que el comercio existe
  const { data: shop } = await supabase
    .from('shops')
    .select('name, owner_id')
    .eq('id', shopId)
    .maybeSingle()

  if (!shop) {
    return NextResponse.json({ success: false, error: 'Comercio no encontrado' }, { status: 404 })
  }

  // 3. Eliminar packs del comercio
  const { error: packsError } = await supabase
    .from('packs')
    .delete()
    .eq('shop_id', shopId)

  if (packsError) {
    console.error('[AdminShopDelete] Error eliminando packs:', packsError)
  }

  // 4. Eliminar reservas asociadas a los packs de este comercio
  // (las reservas tienen pack_id, no shop_id directamente; si la FK es CASCADE esto ya se hizo)
  // Pero por seguridad, buscamos reservas huérfanas
  const { data: orphanReservations } = await supabase
    .from('reservations')
    .select('id, pack_id')
    .eq('shop_id', shopId)

  for (const r of orphanReservations ?? []) {
    await supabase.from('reservations').delete().eq('id', r.id)
  }

  // 5. Eliminar el comercio
  const { error: deleteError } = await supabase
    .from('shops')
    .delete()
    .eq('id', shopId)

  if (deleteError) {
    console.error('[AdminShopDelete] Error:', deleteError)
    return NextResponse.json({ success: false, error: 'Error al eliminar comercio' }, { status: 500 })
  }

  // 6. Si el owner es comercio, degradar a usuario normal
  if (shop.owner_id) {
    await supabase
      .from('user_profiles')
      .update({ role: 'user' })
      .eq('id', shop.owner_id)
      .eq('role', 'comercio')
  }

  // 7. Registrar
  await supabase.from('activity_logs').insert({
    type: 'shop_deleted',
    severity: 'warning',
    title: 'Comercio eliminado',
    description: `Admin ${caller.email} eliminó el comercio "${shop.name}" y todos sus packs`,
    shop_id: shopId,
    metadata: { deleted_by: caller.id },
  })

  return NextResponse.json({ success: true, data: { shopId } })
}
