import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { ROLES, isAdmin } from '@/lib/constants/roles'
import { updateUserRoleSchema } from '@/lib/utils/validations'

/**
 * PATCH /api/admin/users/[id]/role
 * Cambia el rol de un usuario. Solo admin/super_admin.
 *
 * Reglas de seguridad server-side:
 * - Solo admin y super_admin pueden cambiar roles
 * - Nadie puede cambiar su propio rol
 * - Solo super_admin puede asignar/quitar rol super_admin
 * - Solo super_admin puede modificar el rol de otro admin
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  // 2. Verificar que el caller es admin o super_admin
  const { data: callerProfile } = await supabase.from('user_profiles').select('role').eq('id', caller.id).maybeSingle()

  if (!callerProfile || !isAdmin(callerProfile.role)) {
    return NextResponse.json({ success: false, error: 'Permisos insuficientes' }, { status: 403 })
  }

  const callerRole = callerProfile.role

  // 3. Parsear y validar body
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Cuerpo inválido' }, { status: 400 })
  }

  const parsed = updateUserRoleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' },
      { status: 400 },
    )
  }
  const newRole = parsed.data.role

  // 4. No puede cambiar su propio rol
  if (caller.id === targetUserId) {
    return NextResponse.json({ success: false, error: 'No puedes cambiar tu propio rol' }, { status: 403 })
  }

  // 5. Obtener rol actual del target
  const { data: targetProfile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', targetUserId)
    .maybeSingle()

  if (!targetProfile) {
    return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 })
  }

  const targetCurrentRole = targetProfile.role

  // 6. Solo super_admin puede asignar/quitar super_admin
  if (newRole === ROLES.SUPER_ADMIN || targetCurrentRole === ROLES.SUPER_ADMIN) {
    if (callerRole !== ROLES.SUPER_ADMIN) {
      return NextResponse.json(
        { success: false, error: 'Solo super_admin puede gestionar roles super_admin' },
        { status: 403 },
      )
    }
  }

  // 7. Solo super_admin puede modificar el rol de otro admin
  if (targetCurrentRole === ROLES.ADMIN && callerRole !== ROLES.SUPER_ADMIN) {
    return NextResponse.json(
      { success: false, error: 'Solo super_admin puede modificar roles de administradores' },
      { status: 403 },
    )
  }

  // 8. Ejecutar cambio
  const { error: updateError } = await supabase.from('user_profiles').update({ role: newRole }).eq('id', targetUserId)

  if (updateError) {
    console.error('[AdminRoleChange] Error:', updateError)
    return NextResponse.json({ success: false, error: 'Error al actualizar rol' }, { status: 500 })
  }

  // 9. Registrar en activity_logs
  await supabase.from('activity_logs').insert({
    type: 'role_changed',
    severity: 'warning',
    title: 'Rol de usuario modificado',
    description: `Admin ${caller.email} cambió el rol del usuario ${targetUserId} de "${targetCurrentRole}" a "${newRole}"`,
    user_id: targetUserId,
    metadata: {
      changed_by: caller.id,
      old_role: targetCurrentRole,
      new_role: newRole,
    },
  })

  return NextResponse.json({ success: true, data: { userId: targetUserId, role: newRole } })
}
