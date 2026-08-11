import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { isAdmin } from '@/lib/constants/roles'
import { verifyShopSchema } from '@/lib/utils/validations'
import { logger } from '@/lib/logger'

/**
 * PATCH /api/admin/shops/[id]/verify
 * Verifica o desverifica un comercio. Solo admin/super_admin.
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

  const parsed = verifyShopSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' },
      { status: 400 },
    )
  }
  const { verified } = parsed.data

  // 3. Verificar que el comercio existe
  const { data: shop } = await supabase.from('shops').select('name, owner_id').eq('id', shopId).maybeSingle()

  if (!shop) {
    return NextResponse.json({ success: false, error: 'Comercio no encontrado' }, { status: 404 })
  }

  // 4. Actualizar
  const { error: updateError } = await supabase.from('shops').update({ verified }).eq('id', shopId)

  if (updateError) {
    logger.error('AdminShopVerify', updateError)
    return NextResponse.json({ success: false, error: 'Error al actualizar comercio' }, { status: 500 })
  }

  // 5. Notificar al dueño del comercio (tiempo real vía service_role)
  if (verified && shop.owner_id) {
    const admin = getSupabaseAdmin()
    try {
      await admin.from('notifications').insert({
        user_id: shop.owner_id,
        type: 'shop_verified',
        message: `Tu comercio "${shop.name}" ha sido verificado. Ya puedes comenzar a publicar packs.`,
        is_read: false,
        sent_at: new Date().toISOString(),
      })
    } catch {
      // best-effort: no bloquear la verificacion si falla la notificacion
    }
  }

  // 6. Registrar
  await supabase.from('activity_logs').insert({
    type: 'shop_verified',
    severity: 'info',
    title: verified ? 'Comercio verificado' : 'Verificación removida',
    description: `Admin ${caller.email} ${verified ? 'verificó' : 'desverificó'} el comercio "${shop.name}"`,
    shop_id: shopId,
    metadata: { changed_by: caller.id, verified },
  })

  return NextResponse.json({ success: true, data: { shopId, verified } })
}
