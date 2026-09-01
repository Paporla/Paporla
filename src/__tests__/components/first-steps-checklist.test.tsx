import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import FirstStepsChecklist from '@/components/business/dashboard/FirstStepsChecklist'

/**
 * Checklist «Primeros pasos» del comercio (Lote A de simplificación UX).
 *
 * El estado se deriva SOLO de datos reales (shop / verified / hasPacks),
 * nunca de localStorage: aquí se comprueba que cada combinación muestra el
 * paso correcto con UN único botón de acción, y que el checklist desaparece
 * cuando el comercio ya publicó su primer pack.
 */

const shopPending = { name: 'Panadería Staging A', verified: false }
const shopVerified = { name: 'Panadería Staging A', verified: true }

describe('FirstStepsChecklist', () => {
  it('sin perfil: paso 1 activo con botón «Completar mi perfil» (y solo ese)', () => {
    render(<FirstStepsChecklist shop={null} hasPacks={false} />)

    expect(screen.getByText('Primeros pasos')).toBeInTheDocument()
    expect(screen.getByText('0 de 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Completar mi perfil' })).toBeInTheDocument()
    // El link del botón apunta al perfil.
    expect(screen.getByRole('link', { name: 'Completar mi perfil' })).toHaveAttribute('href', '/business/profile')
    // Ningún otro CTA compite por la atención.
    expect(screen.queryByRole('button', { name: 'Crear mi primer pack' })).not.toBeInTheDocument()
  })

  it('perfil enviado, en revisión: paso 2 activo, sin botón primario (no depende del comercio)', () => {
    render(<FirstStepsChecklist shop={shopPending} hasPacks={false} />)

    expect(screen.getByText('1 de 3')).toBeInTheDocument()
    expect(screen.getByText(/Estamos revisando tus datos/)).toBeInTheDocument()
    // No hay botones: solo el enlace discreto para repasar datos.
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Revisar los datos de mi comercio' })).toHaveAttribute(
      'href',
      '/business/profile',
    )
  })

  it('verificado sin packs: paso 3 activo con botón «Crear mi primer pack»', () => {
    render(<FirstStepsChecklist shop={shopVerified} hasPacks={false} />)

    expect(screen.getByText('2 de 3')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Crear mi primer pack' })).toHaveAttribute('href', '/business/packs/new')
    expect(screen.queryByRole('button', { name: 'Completar mi perfil' })).not.toBeInTheDocument()
  })

  it('verificado con packs: el checklist ya no se muestra (camino completado)', () => {
    const { container } = render(<FirstStepsChecklist shop={shopVerified} hasPacks={true} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('caso imposible pero defensivo: packs sin verificar NO completa el camino', () => {
    render(<FirstStepsChecklist shop={shopPending} hasPacks={true} />)
    // Sigue en revisión: el checklist permanece visible en el paso 2.
    expect(screen.getByText('Primeros pasos')).toBeInTheDocument()
    expect(screen.getByText('1 de 3')).toBeInTheDocument()
  })
})
