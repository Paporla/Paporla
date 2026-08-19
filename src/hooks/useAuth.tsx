'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import * as Sentry from '@sentry/nextjs'
import { translateAuthError } from '@/lib/utils/auth-errors'
import { ROLES, isAdmin } from '@/lib/constants/roles'
import { logger } from '@/lib/logger'
import { DEFAULT_MARKET } from '@/lib/constants/markets'
import {
  USER_PROFILE_FIELDS,
  getSafeInternalRedirect,
  mapUserProfile,
  normalizePhoneE164,
  type UserProfileRow,
} from '@/lib/auth/profile'
import type { UserProfile, SignUpRole, ShopData } from '@/types/user'

// ─── Tipos ──────────────────────────────────────────────

interface AuthContextValue {
  user: UserProfile | null
  loading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (
    email: string,
    password: string,
    name: string,
    role: SignUpRole,
    phone?: string,
    shopData?: ShopData,
  ) => Promise<void>
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

  const fetchProfile = useCallback(
    async (userId: string) => {
      const { data: profile, error: fetchError } = await supabase
        .from('user_profiles')
        .select(USER_PROFILE_FIELDS)
        .eq('id', userId)
        .maybeSingle()

      if (fetchError) {
        logger.error('useAuth fetchProfile', fetchError)
        throw fetchError
      }
      if (!profile) return null

      const row = profile as UserProfileRow
      const avatarPublicUrl = row.avatar_path
        ? supabase.storage.from('avatars').getPublicUrl(row.avatar_path).data.publicUrl
        : null

      return mapUserProfile(row, avatarPublicUrl)
    },
    [supabase],
  )

  const getUser = useCallback(
    async (skipLoading = false) => {
      try {
        if (!skipLoading) setLoading(true)

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
            await new Promise((resolve) => setTimeout(resolve, 600))
            const retry = await fetchProfile(authUser.id)
            if (retry) {
              if (retry.accountStatus !== 'active') {
                await supabase.auth.signOut().catch(() => {})
                throw new Error('La cuenta no está disponible')
              }
              setUser(retry)
              return retry
            }
          }

          // El trigger de Auth es el único responsable de crear perfiles.
          // Nunca intentamos un INSERT/UPSERT desde el cliente.
          await supabase.auth.signOut().catch(() => {})
          throw new Error('No se pudo cargar el perfil de la cuenta')
        }

        if (profile.accountStatus !== 'active') {
          await supabase.auth.signOut().catch(() => {})
          throw new Error('La cuenta no está disponible')
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
      .then(() => {
        initialLoadDone.current = true
      })
      .catch((err) => {
        Sentry.captureException(err, { tags: { context: 'auth_init' } })
        setError(err?.message ?? 'Error al cargar la sesion del usuario')
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
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

    return () => {
      subscription.unsubscribe()
    }
  }, [getUser, supabase])

  const signIn = async (email: string, password: string) => {
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) throw new Error(translateAuthError(authError))
    if (!data.user) throw new Error('No se pudo obtener el usuario autenticado')

    const profile = await fetchProfile(data.user.id)
    if (!profile) {
      await supabase.auth.signOut().catch(() => {})
      throw new Error('No existe perfil para este usuario')
    }

    if (profile.accountStatus !== 'active') {
      await supabase.auth.signOut().catch(() => {})
      throw new Error('La cuenta no está disponible')
    }

    setUser(profile)
    setError(null)

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const redirect = getSafeInternalRedirect(params.get('redirect'))
      if (redirect) {
        const extraParams = new URLSearchParams()
        params.forEach((value, key) => {
          if (key !== 'redirect') extraParams.set(key, value)
        })
        router.replace(`${redirect}${extraParams.toString() ? `?${extraParams}` : ''}`)
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
    const normalizedPhone = normalizePhoneE164(phone)

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name.trim(),
          role,
          phone: normalizedPhone,
          locale: DEFAULT_MARKET.locale,
          // Pre-onboarding únicamente. create_own_shop validará de nuevo estos datos.
          ...(role === 'comercio' && shopData?.name
            ? {
                shop_name: shopData.name.trim(),
                shop_description: shopData.description ?? null,
                shop_address: shopData.address ?? null,
                shop_city: shopData.city ?? null,
                shop_phone: normalizedPhone,
              }
            : {}),
        },
        emailRedirectTo: `${window.location.origin}/callback`,
      },
    })

    if (authError) throw authError
    if (!data.user) throw new Error('Error al crear usuario')

    // El trigger de Auth crea el perfil. El comercio se crea posteriormente
    // mediante create_own_shop, después de elegir una localidad válida.

    if (!data.session) {
      const redirectUrl =
        typeof window !== 'undefined'
          ? getSafeInternalRedirect(new URLSearchParams(window.location.search).get('redirect'))
          : null
      router.replace(
        redirectUrl ? `/login?registered=true&redirect=${encodeURIComponent(redirectUrl)}` : '/login?registered=true',
      )
      return
    }

    const profile = await fetchProfile(data.user.id)
    if (!profile) {
      await supabase.auth.signOut().catch(() => {})
      throw new Error('La cuenta se creó, pero el perfil todavía no está disponible')
    }

    setUser(profile)
    setError(null)

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const redirect = getSafeInternalRedirect(params.get('redirect'))
      if (redirect) {
        const extraParams = new URLSearchParams()
        params.forEach((value, key) => {
          if (key !== 'redirect') extraParams.set(key, value)
        })
        router.replace(`${redirect}${extraParams.toString() ? `?${extraParams}` : ''}`)
        return
      }
    }

    redirectByRole(profile.role)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    router.replace('/')
    router.refresh()
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
