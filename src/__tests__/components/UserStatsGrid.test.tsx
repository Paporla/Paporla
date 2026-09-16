import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import UserStatsGrid from '@/components/dashboard/UserStatsGrid'

/**
 * A-05: la tarjeta de dinero del panel del usuario.
 *
 * Antes ponía "Ahorrado" encima de la suma de `total_amount_minor`, que es el
 * PRECIO DEL PACK: llamaba ahorro al gasto. Era una cifra que no era lo que
 * decía ser.
 *
 * El arreglo tiene dos partes y este test vigila las dos:
 *
 *   1. El número es el ahorro real: (precio original − pagado) × unidades.
 *   2. Y si el dato no está (la migración 0050 no se ha corrido todavía), la
 *      ETIQUETA deja de decir "Ahorrado". Porque una palabra bonita encima de
 *      un número falso sigue siendo mentir.
 *
 * La regla de fondo es la de siempre en este proyecto: la interfaz no puede
 * afirmar lo que la app no sabe.
 */
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}))

const base = {
  activeReservations: 2,
  totalPacksRescued: 7,
  co2Saved: 18,
  moneySaved: 21000,
}

describe('UserStatsGrid — tarjeta de dinero (A-05)', () => {
  it('con el dato, dice "Ahorrado"', () => {
    render(<UserStatsGrid stats={{ ...base, savingsAvailable: true }} />)
    expect(screen.getByText('Ahorrado')).toBeTruthy()
    expect(screen.queryByText('Valor de tus packs')).toBeNull()
    // El separador de miles depende del locale del entorno (21.000 / 21,000),
    // así que se comprueba la cifra, no su formato.
    expect(screen.getByText(/\$21[.,]000/)).toBeTruthy()
  })

  it('SIN el dato, NO dice "Ahorrado": dice lo que la cifra es de verdad', () => {
    render(<UserStatsGrid stats={{ ...base, savingsAvailable: false }} />)
    expect(screen.getByText('Valor de tus packs')).toBeTruthy()
    expect(screen.queryByText('Ahorrado')).toBeNull()
  })

  it('si el campo no viene (migración sin aplicar), cae del lado honesto', () => {
    // `savingsAvailable` es opcional: es lo que pasará mientras la migración
    // 0050 no esté corrida. Tiene que comportarse igual que `false`, no como
    // si el dato estuviera.
    render(<UserStatsGrid stats={{ ...base }} />)
    expect(screen.getByText('Valor de tus packs')).toBeTruthy()
    expect(screen.queryByText('Ahorrado')).toBeNull()
  })

  it('el resto de tarjetas no cambian', () => {
    render(<UserStatsGrid stats={{ ...base, savingsAvailable: true }} />)
    expect(screen.getByText('Packs rescatados')).toBeTruthy()
    expect(screen.getByText('CO₂ evitado')).toBeTruthy()
    expect(screen.getByText('Reservas activas')).toBeTruthy()
  })

  it('con error, no pinta ninguna cifra', () => {
    render(<UserStatsGrid stats={base} error="No se pudo cargar" />)
    expect(screen.getByText('No se pudo cargar')).toBeTruthy()
    expect(screen.queryByText('Ahorrado')).toBeNull()
    expect(screen.queryByText('Valor de tus packs')).toBeNull()
  })
})
