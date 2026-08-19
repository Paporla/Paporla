import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DEFAULT_MARKET } from '@/lib/constants/markets'
import { normalizePhoneE164 } from '@/lib/auth/profile'
import { registerSchema } from '@/lib/utils/validations'

const VALID_ROLES = ['user', 'comercio'] as const

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
  }

  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select(
      'id, email, display_name, phone_e164, role, account_status, avatar_path, market_id, locality_id, locale, onboarding_completed_at, email_confirmed_at, last_login_at, created_at, updated_at',
    )
    .eq('id', user.id)
    .maybeSingle()

  if (error || !profile) {
    return NextResponse.json({ success: false, error: 'Perfil no disponible' }, { status: 404 })
  }
  if (profile.account_status !== 'active') {
    return NextResponse.json({ success: false, error: 'Cuenta no disponible' }, { status: 403 })
  }

  return NextResponse.json({ success: true, user: { id: user.id, email: user.email }, profile })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const requestUrl = new URL(request.url)

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Cuerpo de solicitud inválido' }, { status: 400 })
  }

  const { email, password, name, phone, role, shopData } = body as {
    email?: string
    password?: string
    name?: string
    phone?: string
    role?: string
    shopData?: Record<string, unknown> | null
  }

  const parsed = registerSchema.safeParse({
    email,
    password,
    name,
    phone,
    role,
    shopName: (shopData?.name as string) || undefined,
  })
  if (!parsed.success) {
    const firstError = parsed.error.errors[0]?.message ?? 'Datos inválidos'
    return NextResponse.json({ success: false, error: firstError }, { status: 400 })
  }

  const userRole =
    role && VALID_ROLES.includes(role as (typeof VALID_ROLES)[number]) ? (role as (typeof VALID_ROLES)[number]) : 'user'
  const normalizedPhone = normalizePhoneE164(parsed.data.phone)

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${requestUrl.origin}/callback`,
      data: {
        name: parsed.data.name.trim(),
        phone: normalizedPhone,
        role: userRole,
        locale: DEFAULT_MARKET.locale,
        ...(userRole === 'comercio' && shopData?.name ? { shop_name: String(shopData.name).trim() } : {}),
      },
    },
  })

  if (authError) {
    return NextResponse.json({ success: false, error: authError.message }, { status: 400 })
  }
  if (!authData.user) {
    return NextResponse.json({ success: false, error: 'Error al crear usuario' }, { status: 400 })
  }

  // El trigger crea user_profiles. Un comercio se crea después con create_own_shop
  // cuando el propietario seleccione una localidad válida.
  return NextResponse.json({
    success: true,
    user: { id: authData.user.id, email: authData.user.email },
    message: 'Usuario creado exitosamente',
  })
}
