'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import * as Sentry from '@sentry/nextjs'
import { translateAuthError } from '@/lib/utils/auth-errors'
import { ROLES, isAdmin } from '@/lib/constants/roles'
import { logger } from '@/lib/logger'
import type { UserProfile, SignUpRole, ShopData } from '@/types/user'

// ─── Tipos ──────────────────────────────────────────────

interface AuthContextValue {
  user: UserProfile | null
  loading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string, role: SignUpRole, phone?: string, shopData?: ShopData) => Promise<void>
  signOut: () => Promise<void>
  getUser: (skipLoading?: boolean) => Promise<UserProfile | null>
}

const AuthContext = createContext<AuthContextValue | null>(null)

// ─── Provider ───────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = supabaseBrowser()
  const router = useRouter()

  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const redirectByRole = (role?: string | null) => {
    let target = '/dashboard'
    if (role === ROLES.COMERCIO) target = '/business'
    else if (role && isAdmin(role)) target = '/admin'
    router.replace(target)
  }

  const PROFILE_FIELDS = 'id, email, name, phone, role, avatar_url, email_confirmed, created_at'

  const fetchProfile = useCallback(
    async (userId: string) => {
      const { data: profile, error: fetchError } = await supabase
        .from('user_profiles')
        .select(PROFILE_FIELDS)
        .eq('id', userId)
        .maybeSingle()

      if (fetchError) {
        logger.error('useAuth fetchProfile', fetchError)
        throw fetchError
      }

      return profile as UserProfile | null
    },
    [supabase],
  )

  const getUser = useCallback(
    async (skipLoading = false) => {
      try {
        if (!skipLoading) setLoading(true)

        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          setUser(null)
          return null
        }

        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

        if (authError || !authUser) {
          if (authError) {
            // Si el usuario fue eliminado, limpiar la sesion para no seguir reintentando
            if (authError.message?.includes('does not exist') || authError.message?.includes('not found')) {
              await supabase.auth.signOut().catch(() => {})
            }
            logger.error('useAuth getSession authError', authError)
          }
          setUser(null)
          return null
        }

        const profile = await fetchProfile(authUser.id)

        if (!profile) {
          logger.warn('useAuth getUser', `Usuario autenticado sin perfil — reintentando: ${authUser.id}`)
          for (let attempt = 0; attempt < 2; attempt++) {
            await new Promise((r) => setTimeout(r, 600))
            const retry = await fetchProfile(authUser.id)
            if (retry) {
              setUser(retry)
              return retry
            }
          }
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
      } catch (err) {
        logger.error('useAuth getUser', err)
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
      .then(() => { initialLoadDone.current = true })
      .catch((err) => {
        Sentry.captureException(err, { tags: { context: 'auth_init' } })
        setError(err?.message ?? 'Error al cargar la sesion del usuario')
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        if (!initialLoadDone.current) return
        getUser(true).catch((err) => {
          Sentry.captureException(err, { tags: { context: 'auth_state_change' } })
          setError(err?.message ?? 'Error al cargar el perfil del usuario')
        })
      }
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setError(null)
        setLoading(false)
      }
    })

    return () => { subscription.unsubscribe() }
  }, [getUser, supabase])

  const signIn = async (email: string, password: string) => {
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) throw new Error(translateAuthError(authError))
    if (!data.user) throw new Error('No se pudo obtener el usuario autenticado')

    const profile = await fetchProfile(data.user.id)
    if (!profile) throw new Error('No existe perfil para este usuario')

    setUser(profile)
    setError(null)

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const redirect = params.get('redirect')
      if (redirect) {
        const extraParams = new URLSearchParams()
        params.forEach((value, key) => { if (key !== 'redirect') extraParams.set(key, value) })
        router.replace(`${redirect}${extraParams.toString() ? `?${extraParams}` : ''}`)
        return
      }
    }

    redirectByRole(profile.role)
  }

  const signUp = async (
    email: string, password: string, name: string,
    role: SignUpRole, phone?: string, shopData?: ShopData,
  ) => {
    const { data, error: authError } = await supabase.auth.signUp({
      email, password,
      options: {
        data: {
          name, role, phone: phone ?? null,
          // Datos del comercio (el callback los usa para crear la shop via service_role)
          ...(role === 'comercio' && shopData?.name ? {
            shop_name: shopData.name,
            shop_description: shopData.description ?? null,
            shop_address: shopData.address ?? null,
            shop_city: shopData.city ?? null,
            shop_phone: shopData.phone ?? null,
          } : {}),
        },
        emailRedirectTo: `${window.location.origin}/callback`,
      },
    })

    if (authError) throw authError
    if (!data.user) throw new Error('Error al crear usuario')

    // La creacion del comercio se hace en el servidor (callback/route.ts)
    // Los datos ya viajan en user_metadata -> no se necesita updateUser aqui.

    // Notificar admins (best-effort, fire-and-forget)
    void supabase.from('user_profiles').select('id').in('role', [ROLES.ADMIN, ROLES.SUPER_ADMIN]).then(({ data: admins }) => {
      if (!admins?.length) return
      void import('@/lib/notifications/sendNotification').then(({ sendBatchNotifications }) => {
        void sendBatchNotifications(admins.map((admin) => ({
          userId: admin.id, type: 'new_user' as const,
          message: `${name ?? 'Usuario'} se registro como ${role === ROLES.COMERCIO ? 'comercio' : 'usuario'}${role === ROLES.COMERCIO && shopData?.name ? ` - ${shopData.name}` : ''}`,
        })))
      })
    })

    if (!data.session) {
      const redirectUrl = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('redirect') : null
      router.replace(redirectUrl ? `/login?registered=true&redirect=${encodeURIComponent(redirectUrl)}` : '/login?registered=true')
      return
    }

    const profile = await fetchProfile(data.user.id)
    if (!profile) { router.replace('/login?registered=true'); return }

    setUser(profile)
    setError(null)

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const redirect = params.get('redirect')
      if (redirect) {
        const extraParams = new URLSearchParams()
        params.forEach((value, key) => { if (key !== 'redirect') extraParams.set(key, value) })
        router.replace(`${redirect}${extraParams.toString() ? `?${extraParams}` : ''}`)
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

  return (
    <AuthContext.Provider value={{ user, loading, error, signIn, signUp, signOut, getUser }}>
      {children}
    </AuthContext.Provider>
  )
}

// ─── Hook ───────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>. Envuelve tu app con AuthProvider en providers.tsx.')
  }
  return ctx
}
