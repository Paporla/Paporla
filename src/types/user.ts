// ============================================
// TIPOS DE USUARIO — modelo de aplicación
// ============================================

export type UserRole = 'user' | 'comercio' | 'admin' | 'super_admin'

export interface UserProfile {
  id: string
  role: UserRole
  accountStatus: string
  email: string | null
  displayName: string | null
  phoneE164: string | null
  avatarPath: string | null
  avatarPublicUrl: string | null
  marketId: string | null
  localityId: string | null
  locale: string
  onboardingCompletedAt: string | null
  emailConfirmedAt: string | null
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
}

export type SignUpRole = 'user' | 'comercio'

// Datos de pre-onboarding. El comercio se crea después mediante create_own_shop,
// cuando el propietario haya elegido una localidad válida del mercado.
export interface ShopData {
  name?: string
  description?: string | null
  address?: string | null
  city?: string | null
  phone?: string | null
}
