import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import MarketSelectionBanner from '@/components/dashboard/MarketSelectionBanner'

describe('MarketSelectionBanner', () => {
  it('dice por qué aparece: sin mercado no se puede reservar', () => {
    render(<MarketSelectionBanner />)
    expect(screen.getByText('Para reservar packs, elige tu mercado')).toBeDefined()
    expect(screen.getByText(/Tu perfil todavía no tiene mercado/)).toBeDefined()
  })

  it('el botón lleva al selector de mercado en /profile', () => {
    render(<MarketSelectionBanner />)
    const link = screen.getByRole('link', { name: /Elegir mi mercado/ })
    expect(link).toHaveAttribute('href', '/profile')
  })
})
