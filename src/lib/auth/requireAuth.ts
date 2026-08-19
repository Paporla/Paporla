import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getActiveUserRole } from '@/lib/auth/profile'
import type { UserRole } from '@/types/user'

export async function requireAuth(allowedRoles?: UserRole[]) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('role, account_status')
    .eq('id', user.id)
    .maybeSingle()

  const role = profileError ? null : getActiveUserRole(profile)
  if (!role) {
    redirect('/login?error=account_unavailable')
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    if (role === 'comercio') redirect('/business')
    if (role === 'admin' || role === 'super_admin') redirect('/admin')
    redirect('/dashboard')
  }

  return { user, role }
}
