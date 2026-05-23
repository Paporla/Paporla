import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Modal from '@/components/ui/Modal'

describe('Modal', () => {
  it('renders children when open', () => {
    render(
      <Modal isOpen={true} onClose={() => {}}>
        <p>Contenido</p>
      </Modal>,
    )
    expect(screen.getByText('Contenido')).toBeDefined()
  })

  it('does not render when closed', () => {
    render(
      <Modal isOpen={false} onClose={() => {}}>
        <p>Contenido</p>
      </Modal>,
    )
    expect(screen.queryByText('Contenido')).toBeNull()
  })

  it('calls onClose when overlay is clicked', () => {
    const onClose = vi.fn()
    render(
      <Modal isOpen={true} onClose={onClose}>
        <p>Contenido</p>
      </Modal>,
    )
    const overlay = document.querySelector('[aria-hidden="true"]')
    if (overlay) fireEvent.click(overlay)
    expect(onClose).toHaveBeenCalled()
  })

  it('renders title when provided', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Mi Modal">
        <p>Contenido</p>
      </Modal>,
    )
    expect(screen.getByText('Mi Modal')).toBeDefined()
  })

  it('has dialog role and aria-modal', () => {
    render(
      <Modal isOpen={true} onClose={() => {}}>
        <p>Contenido</p>
      </Modal>,
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeDefined()
    expect(dialog.getAttribute('aria-modal')).toBe('true')
  })

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn()
    render(
      <Modal isOpen={true} onClose={onClose}>
        <p>Contenido</p>
      </Modal>,
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })
})
