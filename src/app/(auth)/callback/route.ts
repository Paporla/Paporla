import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import { sendWelcomeEmail } from '@/lib/email'

import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = await createClient()

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      logger.error('Auth Callback', error)
      return NextResponse.redirect(new URL('/login?error=auth_callback', request.url))
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const { data: profile } = await supabase.from('user_profiles').select('role, name').eq('id', user.id).maybeSingle()

    const role = profile?.role ?? 'user'

    // Enviar email de bienvenida (no bloqueante, server-side con acceso a RESEND_API_KEY)
    if (user.email) {
      sendWelcomeEmail(user.email, profile?.name ?? 'Usuario').catch((err) =>
        logger.error('Callback Welcome Email', err),
      )
    }

    // El trigger notify_admins_on_new_user ya crea activity_logs y notificaciones
    // al insertar en user_profiles. No duplicamos aqui.

    // Crear comercio si el usuario es comercio (server-side, sin restricciones RLS)
    // Redirigir a /business/profile si es nuevo, /business si ya existia
    if (role === 'comercio') {
      const isNew = await createShopIfNeeded(user).catch((err) => {
        logger.error('Callback createShop', err)
        return false
      })
      const dest = isNew ? '/business/profile?new=true' : '/business'
      return NextResponse.redirect(new URL(dest, request.url))
    }

    if (role === 'admin' || role === 'super_admin') {
      return NextResponse.redirect(new URL('/admin', request.url))
    }

    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.redirect(new URL('/login', request.url))
}

/**
 * Crea el comercio para un usuario recien registrado como 'comercio'.
 * Usa getSupabaseAdmin() (service_role) para evitar restricciones RLS.
 * Los datos del comercio vienen de user_metadata (guardados en signUp).
 */
async function createShopIfNeeded(user: { id: string; user_metadata?: Record<string, unknown> }): Promise<boolean> {
  const meta = user.user_metadata ?? {}
  const shopName = (meta.shop_name as string) || (meta.name as string)

  if (!shopName) return false

  const admin = getSupabaseAdmin()

  // Verificar si ya tiene comercio (evitar duplicados en reintentos)
  const { data: existing } = await admin.from('shops').select('id').eq('owner_id', user.id).maybeSingle()
  if (existing) return false // ya existia

  await admin.from('shops').insert({
    owner_id: user.id,
    name: shopName,
    description: (meta.shop_description as string) ?? null,
    address: (meta.shop_address as string) ?? null,
    city: (meta.shop_city as string) ?? null,
    phone: (meta.shop_phone as string) ?? null,
  })

  return true // recien creado
}

/**
 * Notifica a los admins sobre un nuevo registro y crea activity_log.
 * Solo se ejecuta server-side, tiene acceso a SERVICE_ROLE_KEY.
 */
async function notifyAdminsAndLog(userId: string, email: string, name: string, role: string) {
  try {
    const admin = getSupabaseAdmin()

    // 1. Insertar activity_log
    await admin.from('activity_logs').insert({
      user_id: userId,
      type: role === 'comercio' ? 'shop_created' : 'user_registered',
      severity: role === 'comercio' ? 'warning' : 'info',
      title: role === 'comercio' ? 'Nuevo comercio pendiente de verificacion' : 'Nuevo usuario registrado',
      description: `${name} (${email}) se registro como ${role === 'comercio' ? 'comercio' : 'usuario'}`,
    })

    // 2. Notificar a todos los admins
    const { data: admins } = await admin.from('user_profiles').select('id').in('role', ['admin', 'super_admin'])
    if (!admins?.length) return

    const notifications = admins.map((a) => ({
      user_id: a.id,
      type: role === 'comercio' ? 'new_shop' : 'new_user',
      message: `${name} (${email}) se registro como ${role === 'comercio' ? 'comercio' : 'usuario'}`,
      is_read: false,
      sent_at: new Date().toISOString(),
    }))

    await admin.from('notifications').insert(notifications)
  } catch (err) {
    logger.error('notifyAdminsAndLog', err)
  }
}
