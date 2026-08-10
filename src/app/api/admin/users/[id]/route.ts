import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { isAdmin } from '@/lib/constants/roles'

/**
 * DELETE /api/admin/users/[id]
 * Elimina un usuario y sus datos asociados. Solo admin/super_admin.
 *
 * Reglas:
 * - Solo admin y super_admin pueden eliminar usuarios
 * - Nadie puede eliminarse a sí mismo
 * - Solo super_admin puede eliminar a otro admin
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: targetUserId } = await params
  const supabase = await createClient()

  // 1. Verificar autenticación
  const {
    data: { user: caller },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !caller) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  }

  // 2. Verificar que el caller es admin/super_admin
  const { data: callerProfile } = await supabase.from('user_profiles').select('role').eq('id', caller.id).maybeSingle()

  if (!callerProfile || !isAdmin(callerProfile.role)) {
    return NextResponse.json({ success: false, error: 'Permisos insuficientes' }, { status: 403 })
  }

  // 3. No puede eliminarse a sí mismo
  if (caller.id === targetUserId) {
    return NextResponse.json({ success: false, error: 'No puedes eliminarte a ti mismo' }, { status: 403 })
  }

  // 4. Obtener perfil del target
  const { data: targetProfile } = await supabase
    .from('user_profiles')
    .select('role, email')
    .eq('id', targetUserId)
    .maybeSingle()

  if (!targetProfile) {
    return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 })
  }

  // 5. Solo super_admin puede eliminar a otro admin
  if (targetProfile.role === 'admin' || targetProfile.role === 'super_admin') {
    if (callerProfile.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Solo super_admin puede eliminar administradores' },
        { status: 403 },
      )
    }
  }

  // 6. Eliminar datos asociados en orden (cascada manual)
  // Notificaciones
  await supabase.from('notifications').delete().eq('user_id', targetUserId)
  // Favoritos
  await supabase.from('favorites').delete().eq('user_id', targetUserId)
  // Reservas (si es usuario normal)
  const { data: reservations } = await supabase.from('reservations').select('id').eq('user_id', targetUserId)
  for (const r of reservations ?? []) {
    await supabase.from('reservations').delete().eq('id', r.id)
  }
  // Shops (si es comercio)
  const { data: shops } = await supabase.from('shops').select('id').eq('owner_id', targetUserId)
  for (const s of shops ?? []) {
    await supabase.from('packs').delete().eq('shop_id', s.id)
    await supabase.from('shops').delete().eq('id', s.id)
  }
  // Finalmente, el perfil
  const { error: deleteError } = await supabase.from('user_profiles').delete().eq('id', targetUserId)

  if (deleteError) {
    console.error('[AdminUserDelete] Error:', deleteError)
    return NextResponse.json({ success: false, error: 'Error al eliminar usuario' }, { status: 500 })
  }

  // Registrar en activity_logs
  await supabase.from('activity_logs').insert({
    type: 'user_deleted',
    severity: 'warning',
    title: 'Usuario eliminado',
    description: `Admin ${caller.email} eliminó al usuario ${targetProfile.email ?? targetUserId}`,
    user_id: targetUserId,
    metadata: {
      deleted_by: caller.id,
      target_role: targetProfile.role,
    },
  })

  return NextResponse.json({ success: true, data: { userId: targetUserId } })
}
