import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
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

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, email, name, phone, role, avatar_url, email_confirmed, last_login, created_at')
    .eq('id', user.id)
    .maybeSingle()

  return NextResponse.json({
    success: true,
    user: { id: user.id, email: user.email },
    profile,
  })
}

export async function POST(request: Request) {
  const supabase = await createClient()

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Cuerpo de solicitud inválido' }, { status: 400 })
  }

  const { email, password, name, role, shopData } = body as {
    email?: string
    password?: string
    name?: string
    role?: string
    shopData?: Record<string, unknown> | null
  }

  const parsed = registerSchema.safeParse({
    email,
    password,
    name,
    role,
    shopName: (shopData?.name as string) || undefined,
  })
  if (!parsed.success) {
    const firstError = parsed.error.errors[0]?.message || 'Datos inválidos'
    return NextResponse.json({ success: false, error: firstError }, { status: 400 })
  }

  const validEmail = parsed.data.email
  const validPassword = parsed.data.password
  const validName = parsed.data.name
  const userRole = role && VALID_ROLES.includes(role as (typeof VALID_ROLES)[number]) ? role : 'user'

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: validEmail,
    password: validPassword,
    options: { data: { name: validName || '', role: userRole } },
  })

  if (authError) {
    return NextResponse.json({ success: false, error: authError.message }, { status: 400 })
  }

  if (!authData.user) {
    return NextResponse.json({ success: false, error: 'Error al crear usuario' }, { status: 400 })
  }

  if (userRole === 'comercio' && shopData) {
    const { error: shopError } = await supabase.from('shops').insert({
      owner_id: authData.user.id,
      name: String(shopData.name || ''),
      description: shopData.description ? String(shopData.description) : null,
      address: shopData.address ? String(shopData.address) : null,
      city: shopData.city ? String(shopData.city) : null,
      phone: shopData.phone ? String(shopData.phone) : null,
      logo_url: shopData.logo_url ? String(shopData.logo_url) : null,
    })

    if (shopError) {
      return NextResponse.json({ success: false, error: shopError.message }, { status: 400 })
    }
  }

  return NextResponse.json({
    success: true,
    user: { id: authData.user.id, email: authData.user.email },
    message: 'Usuario creado exitosamente',
  })
}
