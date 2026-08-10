// ============================================
// TIPOS DE USUARIO - Fuente única de verdad
// ============================================
// Los tipos base vienen de supabase/types (DB)
// Los tipos de negocio/UI se definen aquí

export type UserRole = 'user' | 'comercio' | 'admin' | 'super_admin'

export interface UserProfile {
  id: string
  email: string | null
  name: string | null
  phone: string | null
  role: UserRole
  avatar_url: string | null
  email_confirmed: boolean | null
  created_at: string | null
  last_login?: string | null
  country?: string | null
  city?: string | null
}

export type SignUpRole = 'user' | 'comercio'

export interface ShopData {
  name?: string
  description?: string | null
  address?: string | null
  city?: string | null
  phone?: string | null
}
