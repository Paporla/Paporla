import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Toast from '@/components/ui/Toast'

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders message text', () => {
    render(<Toast message="Operacion exitosa" type="success" onClose={() => {}} />)
    expect(screen.getByText('Operacion exitosa')).toBeDefined()
  })

  it('calls onClose after duration', () => {
    const onClose = vi.fn()
    render(<Toast message="Test" type="info" onClose={onClose} duration={3000} />)
    vi.advanceTimersByTime(3000)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn()
    render(<Toast message="Test" type="info" onClose={onClose} />)
    const closeButton = screen.getByLabelText('Cerrar notificación')
    fireEvent.click(closeButton)
    expect(onClose).toHaveBeenCalled()
  })

  it('renders with success type', () => {
    render(<Toast message="Exito" type="success" onClose={() => {}} />)
    expect(screen.getByText('Exito')).toBeDefined()
  })

  it('renders with error type', () => {
    render(<Toast message="Error" type="error" onClose={() => {}} />)
    expect(screen.getByText('Error')).toBeDefined()
  })

  it('has alert role for accessibility', () => {
    render(<Toast message="Test" type="error" onClose={() => {}} />)
    expect(screen.getByRole('alert')).toBeDefined()
  })

  it('does not call onClose before duration ends', () => {
    const onClose = vi.fn()
    render(<Toast message="Test" type="info" onClose={onClose} duration={5000} />)
    vi.advanceTimersByTime(3000)
    expect(onClose).not.toHaveBeenCalled()
  })
})
