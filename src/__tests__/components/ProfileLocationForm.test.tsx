import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ProfileLocationForm from '@/components/business/profile/ProfileLocationForm'

function renderForm(latitude: string, longitude: string) {
  return render(
    <ProfileLocationForm
      latitude={latitude}
      longitude={longitude}
      onLatitudeChange={vi.fn()}
      onLongitudeChange={vi.fn()}
    />,
  )
}

describe('ProfileLocationForm (ubicación)', () => {
  it('sin coordenadas no muestra mapa ni error: la ubicación es opcional', () => {
    renderForm('', '')
    expect(screen.getByText('Ingresa coordenadas para ver el mapa')).toBeDefined()
    expect(screen.queryByText(/van juntas/)).toBeNull()
  })

  it('con un par válido muestra la vista previa del punto (Abrir en Maps)', () => {
    renderForm('-33.4489', '-70.6693')
    expect(screen.getByText('-33.4489, -70.6693')).toBeDefined()
    expect(screen.getByText(/Abrir en Maps/)).toBeDefined()
  })

  it('F2b: una coordenada vacía y la otra llena dice por qué, sin vista previa', () => {
    renderForm('-33.4489', '')
    expect(
      screen.getByText('La latitud y la longitud van juntas: completa las dos o déjalas vacías las dos.'),
    ).toBeDefined()
    expect(screen.queryByText(/Abrir en Maps/)).toBeNull()
  })

  it('F2b: latitud fuera de rango dice el rango permitido', () => {
    renderForm('999', '0')
    expect(screen.getByText('La latitud debe estar entre -90 y 90.')).toBeDefined()
  })
})
