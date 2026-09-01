import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

/**
 * Los botones «Registra tu comercio» de la landing y de /about enlazan a
 * /register?role=comercio. El formulario debe llegar con el rol Comercio ya
 * seleccionado (mostrando el campo «Nombre del comercio»); sin el parámetro,
 * con Cliente. Antes el parámetro se ignoraba y el comercio aterrizaba como
 * «Cliente»: fricción en el primer paso de su onboarding.
 */

const mockGet = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: mockGet }),
  useRouter: () => ({ push: vi.fn(), prefetch: vi.fn() }),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ signUp: vi.fn() }),
}))

vi.mock('@/components/ui/ToastProvider', () => ({
  useToast: () => ({ addToast: vi.fn() }),
}))

import RegisterForm from '@/components/auth/RegisterForm'

describe('RegisterForm con ?role=comercio', () => {
  it('preselecciona Comercio cuando la URL trae role=comercio', () => {
    mockGet.mockImplementation((key: string) => (key === 'role' ? 'comercio' : null))
    render(<RegisterForm />)

    // El campo exclusivo del rol comercio debe estar visible desde el inicio.
    expect(screen.getByText('Nombre del comercio')).toBeInTheDocument()
  })

  it('sin parámetro, se mantiene Cliente por defecto', () => {
    mockGet.mockReturnValue(null)
    render(<RegisterForm />)

    expect(screen.queryByText('Nombre del comercio')).not.toBeInTheDocument()
  })

  it('un valor desconocido en role no rompe nada (cae a Cliente)', () => {
    mockGet.mockImplementation((key: string) => (key === 'role' ? 'hacker' : null))
    render(<RegisterForm />)

    expect(screen.queryByText('Nombre del comercio')).not.toBeInTheDocument()
  })
})
