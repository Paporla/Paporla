'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import * as Sentry from '@sentry/nextjs'
import { translateAuthError } from '@/lib/utils/auth-errors'
import { ROLES, isAdmin } from '@/lib/constants/roles'
import type { UserProfile, SignUpRole, ShopData } from '@/types/user'

export function useAuth() {
  const supabase = supabaseBrowser()
  const router = useRouter()

  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

        // Verificar sesión primero para evitar AuthSessionMissingError
        // (getSession() no lanza error cuando no hay sesión)
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session) {
          setUser(null)
          return null
        }

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
          if (process.env.NODE_ENV === 'development')
            console.warn('Usuario autenticado sin perfil — reintentando:', authUser.id)
          // El trigger SQL puede tardar en crear el perfil. Reintentar 2 veces.
          for (let attempt = 0; attempt < 2; attempt++) {
            await new Promise((r) => setTimeout(r, 600))
            const retry = await fetchProfile(authUser.id)
            if (retry) {
              setUser(retry)
              return retry
            }
          }
          // Si después de reintentos sigue sin perfil, crear uno mínimo
          const { data: fallback } = await supabase
            .from('user_profiles')
            .upsert({ id: authUser.id, email: authUser.email, role: 'user' })
            .select(PROFILE_FIELDS)
            .maybeSingle()
          if (fallback) {
            setUser(fallback as UserProfile)
            return fallback as UserProfile
          }
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

  const initialLoadDone = useRef(false)

  useEffect(() => {
    getUser(false)
      .then(() => {
        initialLoadDone.current = true
      })
      .catch((err) => {
        Sentry.captureException(err, { tags: { context: 'auth_init' } })
        const message = err?.message ?? 'Error al cargar la sesión del usuario'
        setError(message)
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        // Evitar doble fetch durante la carga inicial
        if (!initialLoadDone.current) return
        getUser(true).catch((err) => {
          Sentry.captureException(err, { tags: { context: 'auth_state_change' } })
          const message = err?.message ?? 'Error al cargar el perfil del usuario'
          setError(message)
        })
      }

      if (event === 'SIGNED_OUT') {
        setUser(null)
        setError(null)
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

    if (error) throw new Error(translateAuthError(error))

    if (!data.user) {
      throw new Error('No se pudo obtener el usuario autenticado')
    }

    const profile = await fetchProfile(data.user.id)

    if (!profile) {
      throw new Error('No existe perfil para este usuario')
    }

    setUser(profile)
    setError(null)

    // Verificar si hay un redirect pendiente (ej: /login?redirect=/packs&reserve=pack-123)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const redirect = params.get('redirect')
      if (redirect) {
        // Conservar parametros adicionales (reserve, etc.)
        const extraParams = new URLSearchParams()
        params.forEach((value, key) => {
          if (key !== 'redirect') extraParams.set(key, value)
        })
        const queryString = extraParams.toString()
        router.replace(`${redirect}${queryString ? `?${queryString}` : ''}`)
        return
      }
    }

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
          phone: phone ?? null,
          shop_name: role === 'comercio' ? shopData?.name || name : null,
        },
        emailRedirectTo: `${window.location.origin}/callback`,
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
        description: shopData.description ?? null,
        address: shopData.address ?? null,
        city: shopData.city ?? null,
        phone: shopData.phone ?? null,
      })
      if (shopError) console.error('[ShopCreation] Error:', shopError)
    }

    notifyAdminsOfNewUser(name, role, shopData?.name).catch((err) => console.error('[Notifications] Error:', err))

    sendWelcomeEmail(email, name).catch((err) => console.error('[WelcomeEmail] Error:', err))

    if (!data.session) {
      // Conservar redirect pendiente si existe
      const redirectUrl =
        typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('redirect') : null
      const base = '/login?registered=true'
      router.replace(redirectUrl ? `${base}&redirect=${encodeURIComponent(redirectUrl)}` : base)
      return
    }

    const profile = await fetchProfile(data.user.id)

    if (!profile) {
      router.replace('/login?registered=true')
      return
    }

    setUser(profile)
    setError(null)

    // Verificar si hay un redirect pendiente
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const redirect = params.get('redirect')
      if (redirect) {
        const extraParams = new URLSearchParams()
        params.forEach((value, key) => {
          if (key !== 'redirect') extraParams.set(key, value)
        })
        const queryString = extraParams.toString()
        router.replace(`${redirect}${queryString ? `?${queryString}` : ''}`)
        return
      }
    }

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
      message: `${name ?? 'Usuario'} se registro como ${role === ROLES.COMERCIO ? 'comercio' : 'usuario'}${role === ROLES.COMERCIO && shopName ? ` - ${shopName}` : ''}`,
    }))
    await sendBatchNotifications(notifications)
  }

  return {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    getUser,
  }
}
