import { describe, expect, it } from 'vitest'
import {
  getActiveUserRole,
  getSafeInternalRedirect,
  isValidOptionalPhone,
  mapUserProfile,
  normalizePhoneE164,
  type UserProfileRow,
} from '@/lib/auth/profile'

const row: UserProfileRow = {
  id: '11111111-1111-4111-8111-111111111111',
  role: 'user',
  account_status: 'active',
  email: 'user@example.com',
  display_name: 'Usuario Uno',
  phone_e164: '+56955551234',
  avatar_path: '11111111-1111-4111-8111-111111111111/avatar.webp',
  market_id: '10000000-0000-4000-8000-000000000001',
  locality_id: null,
  locale: 'es-CL',
  onboarding_completed_at: null,
  email_confirmed_at: '2026-08-20T00:00:00Z',
  last_login_at: null,
  created_at: '2026-08-20T00:00:00Z',
  updated_at: '2026-08-20T00:00:00Z',
  deleted_at: null,
}

describe('mapUserProfile', () => {
  it('maps canonical database fields without legacy aliases', () => {
    const profile = mapUserProfile(row, 'https://example.com/avatar.webp')

    expect(profile).toMatchObject({
      displayName: 'Usuario Uno',
      phoneE164: '+56955551234',
      avatarPath: row.avatar_path,
      avatarPublicUrl: 'https://example.com/avatar.webp',
      emailConfirmedAt: row.email_confirmed_at,
      accountStatus: 'active',
    })
    expect(profile).not.toHaveProperty('name')
    expect(profile).not.toHaveProperty('avatar_url')
  })

  it('fails closed for an unknown role', () => {
    expect(() => mapUserProfile({ ...row, role: 'owner' }, null)).toThrow(/rol no válido/)
  })
})

describe('getActiveUserRole', () => {
  it('accepts only an active canonical role', () => {
    expect(getActiveUserRole({ role: 'comercio', account_status: 'active' })).toBe('comercio')
    expect(getActiveUserRole({ role: 'admin', account_status: 'suspended' })).toBeNull()
    expect(getActiveUserRole({ role: 'owner', account_status: 'active' })).toBeNull()
    expect(getActiveUserRole(null)).toBeNull()
  })
})

describe('normalizePhoneE164', () => {
  it('normalizes common visual separators', () => {
    expect(normalizePhoneE164('+56 9 5555-1234')).toBe('+56955551234')
    expect(normalizePhoneE164('0056 9 5555 1234')).toBe('+56955551234')
  })

  it('allows an empty optional phone', () => {
    expect(normalizePhoneE164('')).toBeNull()
    expect(isValidOptionalPhone(undefined)).toBe(true)
  })

  it('rejects local or malformed numbers', () => {
    expect(() => normalizePhoneE164('955551234')).toThrow(/formato internacional/)
    expect(isValidOptionalPhone('+123')).toBe(false)
  })
})

describe('getSafeInternalRedirect', () => {
  it('allows only internal application paths', () => {
    expect(getSafeInternalRedirect('/packs?city=Santiago')).toBe('/packs?city=Santiago')
    expect(getSafeInternalRedirect('https://evil.example')).toBeNull()
    expect(getSafeInternalRedirect('//evil.example/path')).toBeNull()
  })
})
