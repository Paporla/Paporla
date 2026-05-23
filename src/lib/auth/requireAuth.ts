import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export type UserRole = 'user' | 'comercio' | 'admin' | 'super_admin'

export async function requireAuth(allowedRoles?: UserRole[]) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
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
