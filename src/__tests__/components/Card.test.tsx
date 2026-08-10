import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Card from '@/components/ui/Card'

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Card content</Card>)
    expect(screen.getByText('Card content')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<Card className="custom-class">Content</Card>)
    expect(screen.getByText('Content')).toHaveClass('custom-class')
  })

  it('applies card-base class by default', () => {
    render(<Card>Content</Card>)
    expect(screen.getByText('Content')).toHaveClass('card-base')
  })

  it('applies card-hover class when hover is true', () => {
    render(<Card hover>Content</Card>)
    expect(screen.getByText('Content')).toHaveClass('card-hover')
  })
})
