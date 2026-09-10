import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import UserQuickActions from '@/components/dashboard/UserQuickActions'

describe('UserQuickActions', () => {
  it('no duplica destinos: fuera la tarjeta Recomendados (L-09)', () => {
    render(<UserQuickActions />)
    // "Recomendados" apuntaba a /packs, el mismo destino que "Explorar packs".
    expect(screen.queryByText('Recomendados')).toBeNull()
    expect(screen.getByText('Explorar packs')).toBeInTheDocument()
    // Cinco acciones, cinco destinos distintos.
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(5)
    const hrefs = links.map((l) => l.getAttribute('href'))
    expect(new Set(hrefs).size).toBe(hrefs.length)
  })
})
