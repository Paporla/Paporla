import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import NotFound, { metadata } from '@/app/not-found'

describe('not-found.tsx (404 global)', () => {
  it('declara robots noindex: un 404 no debe indexarse (f8.5)', () => {
    expect(metadata.robots).toEqual({ index: false })
  })

  it('mantiene los enlaces de rescate (inicio + packs)', () => {
    render(<NotFound />)
    expect(screen.getByRole('heading', { name: /Pagina no encontrada/i })).toBeTruthy()
    expect(screen.getByRole('link', { name: /Ir al inicio/i })).toBeTruthy()
    expect(screen.getByRole('link', { name: /Explorar packs/i })).toBeTruthy()
  })
})
