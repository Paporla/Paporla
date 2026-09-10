import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import PackFinalSummary from '@/components/business/packs/PackFinalSummary'

/**
 * L-14 (spec del fundador): entrar desde el top de más vendidos a un pack
 * expirado mostraba un MURO de texto sin información útil. La ficha de
 * resumen debe contar lo que el pack logró (vendidos, plata, fechas) y poner
 * por delante el camino obvio: duplicar y republicar.
 */

function props(overrides: Record<string, unknown> = {}) {
  return {
    packId: 'pk-1',
    status: 'expired',
    totalStock: 10,
    remainingStock: 2,
    priceMinor: 3990,
    pickupStartAt: '2026-09-01T21:00:00Z',
    pickupEndAt: '2026-09-01T23:00:00Z',
    ...overrides,
  }
}

describe('PackFinalSummary — el muro ahora es una ficha útil', () => {
  it('cuenta lo que el pack logró: 8 vendidos de 10 y la plata', () => {
    render(<PackFinalSummary {...props()} />)

    expect(screen.getByText('8 de 10')).toBeInTheDocument() // unidades vendidas
    expect(screen.getByText('$31.920')).toBeInTheDocument() // brutos: 8 × 3.990
    expect(screen.getByText('$28.728')).toBeInTheDocument() // neto: comisión prov. 10% = 3.192
    expect(screen.getByText('La plataforma se queda $3.192')).toBeInTheDocument()
  })

  it('muestra la ventana de recogida (no el fallback de fecha inválida)', () => {
    render(<PackFinalSummary {...props()} />)
    expect(screen.queryByText('Fecha por confirmar')).not.toBeInTheDocument()
  })

  it('traduce el estado a palabra humana: expired → Expirado, sold_out → Agotado', () => {
    const { unmount } = render(<PackFinalSummary {...props({ status: 'expired' })} />)
    expect(screen.getByText('Expirado')).toBeInTheDocument()
    unmount()

    render(<PackFinalSummary {...props({ status: 'sold_out' })} />)
    expect(screen.getByText('Agotado')).toBeInTheDocument()
  })

  it('un estado desconocido se muestra tal cual (sin inventar traducciones)', () => {
    render(<PackFinalSummary {...props({ status: 'raro' })} />)
    expect(screen.getByText('raro')).toBeInTheDocument()
  })

  it('el camino obvio está por delante: Duplicar y republicar enlaza al duplicate', () => {
    render(<PackFinalSummary {...props()} />)

    const duplicar = screen.getByRole('link', { name: /duplicar y republicar/i })
    expect(duplicar).toHaveAttribute('href', '/business/packs/pk-1/duplicate')
    const listado = screen.getByRole('link', { name: /ir al listado de packs/i })
    expect(listado).toHaveAttribute('href', '/business/packs')
  })

  it('datos viejos que no cuadran (remaining > total) no inventan ventas negativas', () => {
    render(<PackFinalSummary {...props({ totalStock: 5, remainingStock: 8 })} />)

    expect(screen.getByText('0 de 5')).toBeInTheDocument()
    expect(screen.getAllByText('$0')).toHaveLength(2) // brutos y neto en cero
  })
})
