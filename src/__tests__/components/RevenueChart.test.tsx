import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import RevenueChart from '@/components/business/analytics/RevenueChart'

/**
 * Gráfico de ingresos (F4.6). El total se asienta en el formato DETERMINISTA
 * de formatChilePesos: esto es lo que el test garantiza — que el total NO
 * se pinte con toFixed(2) ("$0.00") ni con un separador dependiente de la
 * máquina. (El layout recharts no se asienta: jsdom no mide.)
 */
describe('RevenueChart', () => {
  it('renderiza el total de la serie en el formato CLP determinista', () => {
    render(
      <RevenueChart
        data={[
          { date: '09-24', value: 1500 },
          { date: '09-25', value: 3990 },
        ]}
        title="Ingresos (últimos 7 días)"
        trend={166}
      />,
    )
    // 1500 + 3990 = 5490 → "$5.490" (no "$5490.00", no "$5,490").
    expect(screen.getByText('$5.490')).toBeInTheDocument()
  })

  it('sin datos: estado vacío sin gráfico a medias', () => {
    render(<RevenueChart data={[]} title="Ingresos (últimos 7 días)" />)
    expect(screen.getByText('No hay datos disponibles')).toBeInTheDocument()
  })
})
