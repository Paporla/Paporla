import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils/cn'

describe('cn', () => {
  it('merges Tailwind classes correctly', () => {
    const result = cn('px-4', 'py-2', 'rounded-lg')
    expect(result).toBe('px-4 py-2 rounded-lg')
  })

  it('resolves Tailwind conflicts', () => {
    const result = cn('bg-red-500', 'bg-blue-500')
    expect(result).toBe('bg-blue-500')
  })

  it('handles conditional classes', () => {
    const result = cn('base', true && 'active', false && 'disabled')
    expect(result).toBe('base active')
  })

  it('handles falsy values', () => {
    const result = cn('base', null, undefined, false, 'extra')
    expect(result).toBe('base extra')
  })

  it('handles empty input', () => {
    const result = cn()
    expect(result).toBe('')
  })

  it('handles array of classes', () => {
    const result = cn(['px-4', 'py-2'], 'rounded')
    expect(result).toBe('px-4 py-2 rounded')
  })

  it('merges conflicting size classes', () => {
    const result = cn('text-sm text-lg text-xl')
    expect(result).toBe('text-xl')
  })

  it('merges conflicting padding classes', () => {
    const result = cn('p-2 p-4 p-6')
    expect(result).toBe('p-6')
  })
})
