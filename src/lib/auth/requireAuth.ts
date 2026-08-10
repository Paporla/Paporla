import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { UserRole } from '@/types/user'

export async function requireAuth(allowedRoles?: UserRole[]) {
  const supabase = await createClient()

  // Verificar sesión primero (getSession no lanza error cuando no hay sesión)
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  // getUser() usa el JWT local sin roundtrip a Supabase (más rápido que getSession())
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).maybeSingle()

  const role = profile?.role as UserRole | undefined

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    if (role === 'comercio') redirect('/business')
    if (role === 'admin' || role === 'super_admin') redirect('/admin')
    redirect('/dashboard')
  }

  return { user, role }
}
