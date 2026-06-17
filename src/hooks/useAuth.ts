'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ROLES, isAdmin } from '@/lib/constants/roles'
import type { UserProfile, SignUpRole, ShopData } from '@/types/user'

export function useAuth() {
  const supabase = supabaseBrowser()
  const router = useRouter()

  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const redirectByRole = (role?: string | null) => {
    let target = '/dashboard'
    if (role === ROLES.COMERCIO) target = '/business'
    else if (role && isAdmin(role)) target = '/admin'

    // Usar router.replace para evitar recarga completa de pagina
    router.replace(target)
  }

  const PROFILE_FIELDS = 'id, email, name, phone, role, avatar_url, email_confirmed, created_at'

  const fetchProfile = useCallback(
    async (userId: string) => {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select(PROFILE_FIELDS)
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.error('Error obteniendo perfil:', error)
        throw error
      }

      return profile as UserProfile | null
    },
    [supabase],
  )

  const getUser = useCallback(
    async (skipLoading = false) => {
      try {
        if (!skipLoading) setLoading(true)

        const {
          data: { user: authUser },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError) {
          console.error('Error obteniendo usuario auth:', authError)
          setUser(null)
          return null
        }

        if (!authUser) {
          setUser(null)
          return null
        }

        const profile = await fetchProfile(authUser.id)

        if (!profile) {
          console.warn('Usuario autenticado sin perfil:', authUser.id)
          setUser(null)
          return null
        }

        setUser(profile)
        return profile
      } catch (error) {
        console.error('Error en getUser:', error)
        setUser(null)
        return null
      } finally {
        setLoading(false)
      }
    },
    [fetchProfile, supabase],
  )

  useEffect(() => {
    getUser(false)

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        getUser(true)
      }

      if (event === 'SIGNED_OUT') {
        setUser(null)
        setLoading(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [getUser, supabase])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error

    if (!data.user) {
      throw new Error('No se pudo obtener el usuario autenticado')
    }

    const profile = await fetchProfile(data.user.id)

    if (!profile) {
      throw new Error('No existe perfil para este usuario')
    }

    setUser(profile)
    redirectByRole(profile.role)
  }

  const signUp = async (
    email: string,
    password: string,
    name: string,
    role: SignUpRole,
    phone?: string,
    shopData?: ShopData,
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role,
          phone: phone || null,
          shop_name: role === 'comercio' ? shopData?.name || name : null,
        },
        emailRedirectTo: window.location.origin + '/callback',
      },
    })

    if (error) throw error

    if (!data.user) {
      throw new Error('Error al crear usuario')
    }

    if (role === ROLES.COMERCIO && shopData?.name) {
      const { error: shopError } = await supabase.from('shops').insert({
        owner_id: data.user.id,
        name: shopData.name,
        description: shopData.description || null,
        address: shopData.address || null,
        city: shopData.city || null,
        phone: shopData.phone || null,
      })
      if (shopError) console.error('[ShopCreation] Error:', shopError)
    }

    notifyAdminsOfNewUser(name, role, shopData?.name).catch((err) => console.error('[Notifications] Error:', err))

    sendWelcomeEmail(email, name).catch((err) => console.error('[WelcomeEmail] Error:', err))

    if (!data.session) {
      router.replace('/login?registered=true')
      return
    }

    const profile = await fetchProfile(data.user.id)

    if (!profile) {
      router.replace('/login?registered=true')
      return
    }

    setUser(profile)
    redirectByRole(profile.role)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    window.location.href = '/'
  }

  async function sendWelcomeEmail(email: string, name: string) {
    const { sendWelcomeEmail: sendEmail } = await import('@/lib/email')
    await sendEmail(email, name)
  }

  async function notifyAdminsOfNewUser(name: string, role: string, shopName?: string) {
    const { data: admins } = await supabase
      .from('user_profiles')
      .select('id')
      .in('role', [ROLES.ADMIN, ROLES.SUPER_ADMIN])
    if (!admins || admins.length === 0) return

    const { sendBatchNotifications } = await import('@/lib/notifications/sendNotification')
    const notifications = admins.map((admin) => ({
      userId: admin.id,
      type: 'new_user' as const,
      message: `${name || 'Usuario'} se registro como ${role === ROLES.COMERCIO ? 'comercio' : 'usuario'}${role === ROLES.COMERCIO && shopName ? ' - ' + shopName : ''}`,
    }))
    await sendBatchNotifications(notifications)
  }

  return {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    getUser,
  }
}
