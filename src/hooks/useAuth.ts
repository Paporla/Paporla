'use client'

import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type UserProfile = {
  id: string
  email: string | null
  name: string | null
  phone: string | null
  role: 'user' | 'comercio' | 'admin' | 'super_admin'
  avatar_url?: string | null
  email_confirmed?: boolean | null
  created_at?: string | null
  country?: string | null
  city?: string | null
}

type SignUpRole = 'user' | 'comercio'

type ShopData = {
  name?: string
  description?: string | null
  address?: string | null
  city?: string | null
  phone?: string | null
}

export function useAuth() {
  const supabase = supabaseBrowser()
  const router = useRouter()

  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

    const redirectByRole = (role?: string | null) => {
    let target = '/dashboard'
    if (role === 'comercio') target = '/business'
    else if (role === 'admin' || role === 'super_admin') target = '/admin'

    // Hard navigation para asegurar que cookies se sincronicen
    // y evitar el doble salto del middleware
    window.location.href = target
  }

  const fetchProfile = async (userId: string) => {
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error('Error obteniendo perfil:', error)
      throw error
    }

    return profile as UserProfile | null
  }

  const getUser = async () => {
    try {
      setLoading(true)

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
  }

  useEffect(() => {
    getUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        getUser()
      }

      if (event === 'SIGNED_OUT') {
        setUser(null)
        setLoading(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

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
    shopData?: ShopData
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

    // Enviar email de bienvenida (no bloqueante)
    try {
      const baseUrl = window.location.origin
      fetch(baseUrl + '/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'welcome',
          email: email,
          data: { name },
        }),
      }).catch(err => console.error('[Email] Error welcome:', err))
    } catch (_) {}

    if (!data.session) {
      router.replace('/login?registered=true')
      return
    }

    await new Promise((resolve) => setTimeout(resolve, 500))

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
    router.replace('/')
    router.refresh()
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
