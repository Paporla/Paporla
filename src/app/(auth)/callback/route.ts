import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = await createClient()

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Error en auth callback:', error)
      return NextResponse.redirect(new URL('/login?error=auth_callback', request.url))
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const role = profile?.role || 'user'

    if (role === 'comercio') {
      return NextResponse.redirect(new URL('/business', request.url))
    }

    if (role === 'admin' || role === 'super_admin') {
      return NextResponse.redirect(new URL('/admin', request.url))
    }

    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.redirect(new URL('/login', request.url))
}