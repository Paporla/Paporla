import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import Skeleton from '@/components/ui/Skeleton'

describe('Skeleton', () => {
  it('renders with default variant', () => {
    const { container } = render(<Skeleton />)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('rounded-xl')
    expect(el.className).toContain('animate-pulse')
  })

  it('renders with circle variant', () => {
    const { container } = render(<Skeleton variant="circle" />)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('rounded-full')
  })

  it('renders with text variant', () => {
    const { container } = render(<Skeleton variant="text" />)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('rounded-lg')
  })

  it('applies custom className', () => {
    const { container } = render(<Skeleton className="h-10 w-20" />)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('h-10')
    expect(el.className).toContain('w-20')
  })

  it('is a div element', () => {
    const { container } = render(<Skeleton />)
    expect(container.firstChild?.nodeName).toBe('DIV')
  })
})
