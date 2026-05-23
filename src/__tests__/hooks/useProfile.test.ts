import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useProfile } from '@/hooks/useProfile'
import { supabaseBrowser } from '@/lib/supabase/client'

const mockFrom = vi.fn()
const mockUpdate = vi.fn()
const mockEq = vi.fn()
const mockUpload = vi.fn()
const mockGetPublicUrl = vi.fn()

function setupMockClient() {
  mockEq.mockReturnThis()
  mockUpdate.mockReturnThis()
  mockUpload.mockResolvedValue({ error: null })
  mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://example.com/avatar.jpg' } })

  mockFrom.mockImplementation((table: string) => {
    if (table === 'user_profiles') {
      return { update: mockUpdate, eq: mockEq }
    }
    return {}
  })
  ;(supabaseBrowser as any).mockReturnValue({
    from: mockFrom,
    storage: {
      from: () => ({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      }),
    },
  })
}

const fakeFile = new File(['test'], 'avatar.png', { type: 'image/png' })

describe('useProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMockClient()
  })

  it('updateProfile calls supabase update', async () => {
    const { result } = renderHook(() => useProfile())

    await act(async () => {
      await result.current.updateProfile('user-1', { name: 'New Name' })
    })

    expect(mockUpdate).toHaveBeenCalledWith({ name: 'New Name' })
    expect(mockEq).toHaveBeenCalledWith('id', 'user-1')
  })

  it('uploadAvatar uploads file and updates profile', async () => {
    const { result } = renderHook(() => useProfile())

    let url: string
    await act(async () => {
      url = await result.current.uploadAvatar('user-1', fakeFile)
    })

    expect(mockUpload).toHaveBeenCalled()
    expect(mockUpdate).toHaveBeenCalled()
    expect(url!).toBe('https://example.com/avatar.jpg')
  })

  it('uploadAvatar rejects invalid file type', async () => {
    const invalidFile = new File(['test'], 'test.exe', { type: 'application/x-msdownload' })
    const { result } = renderHook(() => useProfile())

    await expect(
      act(async () => {
        await result.current.uploadAvatar('user-1', invalidFile)
      }),
    ).rejects.toThrow(/Tipo de archivo no permitido/)
  })

  it('uploadAvatar rejects oversized file', async () => {
    const hugeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'huge.jpg', { type: 'image/jpeg' })
    const { result } = renderHook(() => useProfile())

    await expect(
      act(async () => {
        await result.current.uploadAvatar('user-1', hugeFile)
      }),
    ).rejects.toThrow(/excede el tamaño máximo/)
  })

  it('sets uploading state during upload', async () => {
    mockUpload.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve({ error: null }), 100)))
    const { result } = renderHook(() => useProfile())

    act(() => {
      result.current.uploadAvatar('user-1', fakeFile)
    })

    await waitFor(() => expect(result.current.uploading).toBe(true))
    await waitFor(() => expect(result.current.uploading).toBe(false))
  })
})
