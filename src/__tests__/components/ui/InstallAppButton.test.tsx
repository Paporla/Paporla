import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import InstallAppButton from '@/components/ui/InstallAppButton'

afterEach(cleanup)

function mockStandalone(matches: boolean) {
  vi.spyOn(window, 'matchMedia').mockReturnValue({
    matches,
    media: '(display-mode: standalone)',
    addEventListener: () => {},
    removeEventListener: () => {},
  } as unknown as MediaQueryList)
}

describe('InstallAppButton', () => {
  it('pinta el boton y abre instrucciones si el navegador no ofrece el evento', () => {
    mockStandalone(false)
    render(<InstallAppButton />)
    fireEvent.click(screen.getByRole('button', { name: /descarga la app/i }))
    expect(screen.getByText(/Añadir a pantalla de inicio/i)).toBeTruthy()
  })

  it('no pinta nada si la app ya esta instalada', () => {
    mockStandalone(true)
    const { container } = render(<InstallAppButton />)
    expect(container.firstChild).toBeNull()
  })
})
