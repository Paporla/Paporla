import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useToast } from '@/hooks/useToast'

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts with empty toasts', () => {
    const { result } = renderHook(() => useToast())
    expect(result.current.toasts).toEqual([])
  })

  it('adds a toast with default type', () => {
    const { result } = renderHook(() => useToast())
    act(() => {
      result.current.addToast('Hello')
    })
    expect(result.current.toasts).toHaveLength(1)
    expect(result.current.toasts[0].message).toBe('Hello')
    expect(result.current.toasts[0].type).toBe('info')
  })

  it('adds a toast with success type', () => {
    const { result } = renderHook(() => useToast())
    act(() => {
      result.current.addToast('Success!', 'success')
    })
    expect(result.current.toasts[0].type).toBe('success')
  })

  it('adds a toast with error type', () => {
    const { result } = renderHook(() => useToast())
    act(() => {
      result.current.addToast('Error!', 'error')
    })
    expect(result.current.toasts[0].type).toBe('error')
  })

  it('generates unique IDs', () => {
    const { result } = renderHook(() => useToast())
    act(() => {
      result.current.addToast('First')
      result.current.addToast('Second')
    })
    expect(result.current.toasts[0].id).not.toBe(result.current.toasts[1].id)
  })

  it('removes a toast by ID', () => {
    const { result } = renderHook(() => useToast())
    act(() => {
      result.current.addToast('First')
      result.current.addToast('Second')
    })
    const firstId = result.current.toasts[0].id
    act(() => {
      result.current.removeToast(firstId)
    })
    expect(result.current.toasts).toHaveLength(1)
    expect(result.current.toasts[0].message).toBe('Second')
  })

  it('auto-removes toast after 3 seconds', () => {
    const { result } = renderHook(() => useToast())
    act(() => {
      result.current.addToast('Auto remove')
    })
    expect(result.current.toasts).toHaveLength(1)
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(result.current.toasts).toHaveLength(0)
  })

  it('handles multiple toasts', () => {
    const { result } = renderHook(() => useToast())
    act(() => {
      result.current.addToast('One')
      result.current.addToast('Two')
      result.current.addToast('Three')
    })
    expect(result.current.toasts).toHaveLength(3)
  })
})
