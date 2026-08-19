import type { Database } from '@/types/database.generated'
import type { UserProfile, UserRole } from '@/types/user'

export type UserProfileRow = Database['public']['Tables']['user_profiles']['Row']

export const USER_PROFILE_FIELDS =
  'id, role, account_status, email, display_name, phone_e164, avatar_path, market_id, locality_id, locale, onboarding_completed_at, email_confirmed_at, last_login_at, created_at, updated_at'

const USER_ROLES: readonly UserRole[] = ['user', 'comercio', 'admin', 'super_admin']
const E164_PATTERN = /^\+[1-9][0-9]{7,14}$/

export function isUserRole(value: string): value is UserRole {
  return USER_ROLES.includes(value as UserRole)
}

export function getActiveUserRole(profile: { role: string; account_status: string } | null): UserRole | null {
  if (!profile || profile.account_status !== 'active' || !isUserRole(profile.role)) return null
  return profile.role
}

export function normalizePhoneE164(value?: string | null): string | null {
  const trimmed = value?.trim() ?? ''
  if (!trimmed) return null

  const normalized = trimmed.replace(/[\s().-]/g, '').replace(/^00/, '+')
  if (!E164_PATTERN.test(normalized)) {
    throw new Error('Ingresa el teléfono en formato internacional, por ejemplo +56955551234')
  }

  return normalized
}

export function isValidOptionalPhone(value?: string | null): boolean {
  try {
    normalizePhoneE164(value)
    return true
  } catch {
    return false
  }
}

export function getSafeInternalRedirect(value?: string | null): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null

  try {
    const parsed = new URL(value, 'https://paporla.invalid')
    if (parsed.origin !== 'https://paporla.invalid') return null
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return null
  }
}

export function mapUserProfile(row: UserProfileRow, avatarPublicUrl: string | null): UserProfile {
  if (!isUserRole(row.role)) {
    throw new Error('El perfil tiene un rol no válido')
  }

  return {
    id: row.id,
    role: row.role,
    accountStatus: row.account_status,
    email: row.email,
    displayName: row.display_name,
    phoneE164: row.phone_e164,
    avatarPath: row.avatar_path,
    avatarPublicUrl,
    marketId: row.market_id,
    localityId: row.locality_id,
    locale: row.locale,
    onboardingCompletedAt: row.onboarding_completed_at,
    emailConfirmedAt: row.email_confirmed_at,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
