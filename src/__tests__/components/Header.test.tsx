import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Header from '@/components/layout/Header'

/**
 * Lote UX (a11y): la hamburguesa del menú móvil anunciaba solo "Menu" — sin
 * aria-expanded un lector de pantalla no sabe si el menú está abierto o
 * cerrado, y sin Escape el teclado se quedaba atrapado (WCAG 2.1.2). Estos
 * tests fijan el contrato: estado anunciado, etiqueta dinámica, Escape cierra
 * y targets táctiles de 44 px en los botones de icono del header.
 */

const mockUseAuth = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/useAuth', () => ({ useAuth: mockUseAuth }))
vi.mock('next/navigation', () => ({ usePathname: () => '/packs' }))
vi.mock('@/context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() }),
}))

describe('Header — navegación por teclado y ARIA', () => {
  beforeEach(() => {
    // Sin usuario: no campana ni avatar, solo logo + enlaces + hamburguesa.
    mockUseAuth.mockReturnValue({ user: null, loading: false })
  })

  it('menú cerrado: aria-expanded=false, aria-controls y etiqueta "Abrir menú"', () => {
    render(<Header />)

    const boton = screen.getByRole('button', { name: 'Abrir menú' })
    expect(boton).toHaveAttribute('aria-expanded', 'false')
    expect(boton).toHaveAttribute('aria-controls', 'menu-movil')
  })

  it('clic abre (aria-expanded=true, etiqueta "Cerrar menú") y Escape cierra', () => {
    render(<Header />)

    fireEvent.click(screen.getByRole('button', { name: 'Abrir menú' }))
    const boton = screen.getByRole('button', { name: 'Cerrar menú' })
    expect(boton).toHaveAttribute('aria-expanded', 'true')

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.getByRole('button', { name: 'Abrir menú' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('targets táctiles de 44 px: hamburguesa y toggle de tema', () => {
    render(<Header />)

    expect(screen.getByRole('button', { name: 'Abrir menú' })).toHaveClass('min-w-[44px]', 'min-h-[44px]')
    expect(screen.getByRole('button', { name: 'Activar modo claro' })).toHaveClass('min-w-[44px]', 'min-h-[44px]')
  })
})
