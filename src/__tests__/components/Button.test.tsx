import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Button from '@/components/ui/Button'

describe('Button', () => {
  it('renders with children text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('renders loading text when loading', () => {
    render(<Button loading>Submit</Button>)
    expect(screen.getByText('Cargando...')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<Button className="custom-class">Custom</Button>)
    expect(screen.getByRole('button')).toHaveClass('custom-class')
  })

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('is disabled when loading is true', () => {
    render(<Button loading>Loading</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('has type="button" by default', () => {
    render(<Button>Default</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
  })

  it('has type="submit" when specified', () => {
    render(<Button type="submit">Submit</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
  })

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click</Button>)
    await user.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalled()
  })

  /**
   * Lote UX (WCAG AA): el texto del botón primario es oscuro en ambos modos.
   * Blanco sobre el esmeralda del modo claro (#0c9d61) daba ~3.1:1 — no
   * llega a los 4.5:1 que pide el texto de un botón. Sobre el neón del modo
   * oscuro ya era oscuro (~15:1). Este test fija la decisión.
   */
  it('botón primario: texto oscuro sobre verde (contraste AA en ambos modos)', () => {
    render(<Button>Reservar</Button>)
    const btn = screen.getByRole('button')
    expect(btn).toHaveClass('text-dark')
    expect(btn).not.toHaveClass('text-white')
  })
})
