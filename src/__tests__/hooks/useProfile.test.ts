import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { buildAvatarPath, useProfile } from '@/hooks/useProfile'
import { supabaseBrowser } from '@/lib/supabase/client'
import type { UserProfile } from '@/types/user'

const mockRpc = vi.fn()
const mockUpload = vi.fn()
const mockRemove = vi.fn()
const mockGetPublicUrl = vi.fn()

const profile: UserProfile = {
  id: '11111111-1111-4111-8111-111111111111',
  role: 'user',
  accountStatus: 'active',
  email: 'user@example.com',
  displayName: 'Usuario Uno',
  phoneE164: '+56955551234',
  avatarPath: null,
  avatarPublicUrl: null,
  marketId: '10000000-0000-4000-8000-000000000001',
  localityId: null,
  locale: 'es-CL',
  onboardingCompletedAt: null,
  emailConfirmedAt: null,
  lastLoginAt: null,
  createdAt: '2026-08-20T00:00:00Z',
  updatedAt: '2026-08-20T00:00:00Z',
}

function setupMockClient() {
  mockRpc.mockResolvedValue({ data: { success: true }, error: null })
  mockUpload.mockResolvedValue({ error: null })
  mockRemove.mockResolvedValue({ data: [], error: null })
  mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://example.com/avatar.jpg' } })

  vi.mocked(supabaseBrowser).mockReturnValue({
    rpc: mockRpc,
    storage: {
      from: () => ({ upload: mockUpload, remove: mockRemove, getPublicUrl: mockGetPublicUrl }),
    },
  } as never)
}

const fakeFile = new File(['test'], 'avatar.png', { type: 'image/png' })

describe('useProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMockClient()
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('22222222-2222-4222-8222-222222222222')
  })

  it('updates only through update_own_profile', async () => {
    const { result } = renderHook(() => useProfile())

    await act(async () => {
      await result.current.updateProfile({
        displayName: 'Nombre Nuevo',
        phoneE164: '+56911112222',
        avatarPath: null,
        marketId: profile.marketId,
        localityId: null,
        locale: 'es-CL',
      })
    })

    expect(mockRpc).toHaveBeenCalledWith('update_own_profile', {
      p_display_name: 'Nombre Nuevo',
      p_phone_e164: '+56911112222',
      p_avatar_path: '',
      p_market_id: profile.marketId,
      p_locality_id: null,
      p_locale: 'es-CL',
    })
  })

  it('uploads an avatar under avatars/<userId>/<uuid> and stores only its path', async () => {
    const { result } = renderHook(() => useProfile())

    let url = ''
    await act(async () => {
      url = await result.current.uploadAvatar(profile, fakeFile)
    })

    const expectedPath = `${profile.id}/22222222-2222-4222-8222-222222222222.png`
    expect(mockUpload).toHaveBeenCalledWith(expectedPath, fakeFile, { contentType: 'image/png', upsert: false })
    expect(mockRpc).toHaveBeenCalledWith('update_own_profile', expect.objectContaining({ p_avatar_path: expectedPath }))
    expect(url).toBe('https://example.com/avatar.jpg')
  })

  it('removes the previous avatar only after the profile update succeeds', async () => {
    const { result } = renderHook(() => useProfile())

    await act(async () => {
      await result.current.uploadAvatar({ ...profile, avatarPath: `${profile.id}/old.webp` }, fakeFile)
    })

    expect(mockRemove).toHaveBeenCalledWith([`${profile.id}/old.webp`])
  })

  it('removes a newly uploaded orphan when the profile RPC fails', async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error('RPC failed') })
    const { result } = renderHook(() => useProfile())

    await expect(
      act(async () => {
        await result.current.uploadAvatar(profile, fakeFile)
      }),
    ).rejects.toThrow('RPC failed')

    expect(mockRemove).toHaveBeenCalledWith([`${profile.id}/22222222-2222-4222-8222-222222222222.png`])
  })

  it('rejects MIME types not allowed by the bucket', async () => {
    const invalidFile = new File(['test'], 'avatar.gif', { type: 'image/gif' })
    const { result } = renderHook(() => useProfile())

    await expect(result.current.uploadAvatar(profile, invalidFile)).rejects.toThrow(/Tipo de archivo no permitido/)
    expect(mockUpload).not.toHaveBeenCalled()
  })

  it('rejects files larger than the bucket limit', async () => {
    const hugeFile = new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'huge.jpg', { type: 'image/jpeg' })
    const { result } = renderHook(() => useProfile())

    await expect(result.current.uploadAvatar(profile, hugeFile)).rejects.toThrow(/2MB/)
    expect(mockUpload).not.toHaveBeenCalled()
  })

  it('always resets uploading after an upload error', async () => {
    mockUpload.mockResolvedValue({ error: new Error('Upload failed') })
    const { result } = renderHook(() => useProfile())

    await expect(
      act(async () => {
        await result.current.uploadAvatar(profile, fakeFile)
      }),
    ).rejects.toThrow('Upload failed')

    await waitFor(() => expect(result.current.uploading).toBe(false))
  })
})

describe('buildAvatarPath', () => {
  it('does not duplicate the bucket name in the object path', () => {
    expect(buildAvatarPath('user-id', 'image/webp', 'object-id')).toBe('user-id/object-id.webp')
  })
})
