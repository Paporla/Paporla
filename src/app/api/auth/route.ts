import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  return NextResponse.json({ user, profile })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()
  const { email, password, name, role, shopData } = body

  // Registrar usuario
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name, role } }
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  if (!authData.user) {
    return NextResponse.json({ error: 'Error al crear usuario' }, { status: 400 })
  }

  // Esperar a que el trigger cree el perfil
  await new Promise(resolve => setTimeout(resolve, 1000))

  // Si es comercio, crear el shop
  if (role === 'comercio' && shopData) {
    const { error: shopError } = await supabase
      .from('shops')
      .insert({
        owner_id: authData.user.id,
        name: shopData.name,
        description: shopData.description || null,
        address: shopData.address || null,
        city: shopData.city || null,
        phone: shopData.phone || null,
        logo_url: shopData.logo_url || null,
      })

    if (shopError) {
      return NextResponse.json({ error: shopError.message }, { status: 400 })
    }
  }

  return NextResponse.json({ 
    success: true, 
    user: authData.user,
    message: 'Usuario creado exitosamente'
  })
}