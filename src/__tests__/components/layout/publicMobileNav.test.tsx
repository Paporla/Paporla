import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  usePathname: () => '/packs',
}))

const useAuthMock = vi.fn()
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => useAuthMock(),
}))

import PublicMobileNav from '@/components/layout/PublicMobileNav'

describe('PublicMobileNav (L-66)', () => {
  it('sin sesion: el atajo de cuenta lleva al login', () => {
    useAuthMock.mockReturnValue({ user: null })
    render(<PublicMobileNav />)
    expect(screen.getByRole('link', { name: /entrar/i })).toHaveAttribute('href', '/login')
    expect(screen.getByRole('link', { name: /packs/i })).toHaveAttribute('href', '/packs')
    expect(screen.getByRole('link', { name: /comercios/i })).toHaveAttribute('href', '/shops')
    expect(screen.getByRole('link', { name: /inicio/i })).toHaveAttribute('href', '/')
  })

  it('con sesion: el atajo de cuenta lleva al panel', () => {
    useAuthMock.mockReturnValue({ user: { id: 'u1' } })
    render(<PublicMobileNav />)
    expect(screen.getByRole('link', { name: /mi cuenta/i })).toHaveAttribute('href', '/dashboard')
  })
})
