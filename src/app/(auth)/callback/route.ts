import { createClient } from '@/lib/supabase/server'
import { getActiveUserRole, getSafeInternalRedirect } from '@/lib/auth/profile'
import { logger } from '@/lib/logger'
import { sendWelcomeEmail } from '@/lib/email'
import { NextResponse, after } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

const OTP_TYPES: EmailOtpType[] = ['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email']

function parseOtpType(raw: string | null): EmailOtpType | null {
  return raw && (OTP_TYPES as string[]).includes(raw) ? (raw as EmailOtpType) : null
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const tokenHash = requestUrl.searchParams.get('token_hash')
  const otpType = parseOtpType(requestUrl.searchParams.get('type'))

  if (!code && !(tokenHash && otpType)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const supabase = await createClient()

  // Dos caminos (patron oficial de Supabase para SSR):
  // - token_hash + type: enlaces de email (verifyOtp). No dependen del
  //   navegador de origen: el PKCE fallaba con "code verifier not found"
  //   si el email se abria en otro navegador/dispositivo o un antivirus
  //   pre-visitaba el enlace (detectado en logs de Vercel, 30-ago).
  // - code: flujo PKCE clasico (OAuth y enlaces antiguos), se mantiene.
  const { error } =
    tokenHash && otpType
      ? await supabase.auth.verifyOtp({ type: otpType, token_hash: tokenHash })
      : await supabase.auth.exchangeCodeForSession(code as string)

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
  // after(): en Vercel la función se congela al responder; un void suelto
  // moría a medias y el email nunca salía (sin log en Resend ni en Sentry,
  // detectado en staging 30-ago). after() mantiene viva la función hasta
  // completar el envío, sin retrasar la redirección del usuario.
  if (process.env.RESEND_API_KEY && user.email && next !== '/reset-password') {
    const email = user.email
    const displayName = profile.display_name ?? 'Usuario'
    after(async () => {
      try {
        await sendWelcomeEmail(email, displayName)
      } catch (emailError) {
        logger.error('Callback Welcome Email', emailError)
      }
    })
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
