import { createClient } from '@/lib/supabase/server'
import { getActiveUserRole, getSafeInternalRedirect } from '@/lib/auth/profile'
import { logger } from '@/lib/logger'
import { sendWelcomeEmail } from '@/lib/email'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

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

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('role, account_status, display_name')
    .eq('id', user.id)
    .maybeSingle()

  const role = profileError ? null : getActiveUserRole(profile)
  if (!profile || !role) {
    logger.error('Auth Callback Profile', profileError ?? new Error('Perfil no disponible'))
    return NextResponse.redirect(new URL('/login?error=account_unavailable', request.url))
  }

  const next = getSafeInternalRedirect(requestUrl.searchParams.get('next'))

  // La recuperación de contraseña no debe disparar un email de bienvenida.
  if (process.env.RESEND_API_KEY && user.email && next !== '/reset-password') {
    void sendWelcomeEmail(user.email, profile.display_name ?? 'Usuario').catch((emailError) =>
      logger.error('Callback Welcome Email', emailError),
    )
  }

  if (next) {
    return NextResponse.redirect(new URL(next, request.url))
  }

  if (role === 'comercio') {
    // La creación del comercio requiere mercado/localidad y se hará mediante
    // create_own_shop en el módulo de onboarding, nunca con service_role aquí.
    return NextResponse.redirect(new URL('/business/profile?new=true', request.url))
  }

  if (role === 'admin' || role === 'super_admin') {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  return NextResponse.redirect(new URL('/dashboard', request.url))
}
