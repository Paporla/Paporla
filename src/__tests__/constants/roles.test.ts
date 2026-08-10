import { describe, it, expect } from 'vitest'
import { ROLES, ROLE_LABELS, isAdmin } from '@/lib/constants/roles'

describe('ROLES', () => {
  it('defines all expected roles', () => {
    expect(ROLES.USER).toBe('user')
    expect(ROLES.COMERCIO).toBe('comercio')
    expect(ROLES.ADMIN).toBe('admin')
    expect(ROLES.SUPER_ADMIN).toBe('super_admin')
  })

  it('is frozen with as const (values not extensible)', () => {
    const roleValues = Object.values(ROLES)
    expect(roleValues).toContain('user')
    expect(roleValues).toContain('comercio')
    expect(roleValues).toContain('admin')
    expect(roleValues).toContain('super_admin')
    expect(roleValues).toHaveLength(4)
  })
})

describe('ROLE_LABELS', () => {
  it('provides human-readable labels for each role', () => {
    expect(ROLE_LABELS.user).toBe('Usuario')
    expect(ROLE_LABELS.comercio).toBe('Comercio')
    expect(ROLE_LABELS.admin).toBe('Administrador')
    expect(ROLE_LABELS.super_admin).toBe('Super Administrador')
  })

  it('covers all roles defined in ROLES', () => {
    const labels = Object.keys(ROLE_LABELS)
    const roles = Object.values(ROLES)
    expect(labels.sort()).toEqual(roles.sort())
  })
})

describe('isAdmin', () => {
  it('returns true for ADMIN role', () => {
    expect(isAdmin(ROLES.ADMIN)).toBe(true)
  })

  it('returns true for SUPER_ADMIN role', () => {
    expect(isAdmin(ROLES.SUPER_ADMIN)).toBe(true)
  })

  it('returns false for USER role', () => {
    expect(isAdmin(ROLES.USER)).toBe(false)
  })

  it('returns false for COMERCIO role', () => {
    expect(isAdmin(ROLES.COMERCIO)).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isAdmin('')).toBe(false)
  })

  it('returns false for unknown role', () => {
    expect(isAdmin('moderator')).toBe(false)
  })

  it('returns false for null-ish string', () => {
    expect(isAdmin('null')).toBe(false)
  })
})
