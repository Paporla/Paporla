import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import RevenueSplitNote from '@/components/business/RevenueSplitNote'
import BusinessStatsGrid from '@/components/business/dashboard/BusinessStatsGrid'
import AnalyticsSummaryCards from '@/components/business/analytics/AnalyticsSummaryCards'
import { formatChilePesos } from '@/lib/utils/formatPrice'

/**
 * L-11 (pedido del fundador): los ingresos del comercio muestran el bruto y
 * él tenía que restar la comisión de cabeza. Ahora las tarjetas dicen cuánto
 * recibe realmente. Estos tests fijan el texto visible y que la nota solo
 * aparece cuando hay ingresos que repartir.
 */

describe('RevenueSplitNote', () => {
  it('muestra el neto y la comisión provisional en una línea', () => {
    render(<RevenueSplitNote grossMinor={3990} />)
    expect(screen.getByText(`Recibes ${formatChilePesos(3591)} · comisión prov. 10%`)).toBeInTheDocument()
  })

  it('el title guarda el desglose completo Total − Comisión = Recibes', () => {
    render(<RevenueSplitNote grossMinor={3990} />)
    const note = screen.getByTitle(/Total \$3\.990/)
    expect(note.getAttribute('title')).toContain('recibes $3.591')
    expect(note.getAttribute('title')).toContain('módulo de pagos')
  })
})

describe('BusinessStatsGrid — tarjeta Ingresos con desglose', () => {
  const stats = {
    activePacks: 2,
    totalPacks: 5,
    totalReservations: 7,
    totalRevenue: 3990,
    todayReservations: 1,
    pendingReservations: 0,
  }

  it('con ingresos > 0 aparece la nota "Recibes"', () => {
    render(<BusinessStatsGrid stats={stats} />)
    expect(screen.getByText(`Recibes ${formatChilePesos(3591)} · comisión prov. 10%`)).toBeInTheDocument()
    expect(screen.getByText(formatChilePesos(3990))).toBeInTheDocument() // el bruto sigue visible
  })

  it('con ingresos 0 no hay nota (nada que repartir)', () => {
    render(<BusinessStatsGrid stats={{ ...stats, totalRevenue: 0 }} />)
    expect(screen.queryByText(/Recibes/)).not.toBeInTheDocument()
  })
})

describe('AnalyticsSummaryCards — tarjeta Ingresos totales con desglose', () => {
  const summary = {
    totalRevenue: 10000,
    totalReservations: 4,
    completedReservations: 3,
    cancelledReservations: 1,
    activePacks: 1,
    totalPacksCreated: 2,
  }

  it('muestra bruto y neto (10% de 10.000 = 1.000)', () => {
    render(<AnalyticsSummaryCards summary={summary} />)
    expect(screen.getByText(formatChilePesos(10000))).toBeInTheDocument()
    expect(screen.getByText(`Recibes ${formatChilePesos(9000)} · comisión prov. 10%`)).toBeInTheDocument()
  })
})
