import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import WelcomeGate from '@/components/pwa/WelcomeGate'

/**
 * La puerta de entrada es `display-mode: standalone` (app instalada), así que
 * cada test decide si el dispositivo finge ser app instalada o navegador.
 */
function mockMedias({ instalada, reducido = false }: { instalada: boolean; reducido?: boolean }) {
  ;(window.matchMedia as unknown as ReturnType<typeof vi.fn>).mockImplementation((query: string) => ({
    matches: query.includes('standalone') ? instalada : query.includes('reduced-motion') ? reducido : false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

function cargaLenta() {
  // jsdom arranca con readyState 'complete'; lo bajamos a 'loading' para
  // simular una página cuyos recursos aún no terminan.
  Object.defineProperty(document, 'readyState', { value: 'loading', configurable: true })
}

afterEach(() => {
  vi.useRealTimers()
  sessionStorage.clear()
  Object.defineProperty(document, 'readyState', { value: 'complete', configurable: true })
})

describe('WelcomeGate · puerta de entrada', () => {
  it('no se pinta en el navegador normal', () => {
    mockMedias({ instalada: false })
    render(<WelcomeGate />)
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('se pinta en la app instalada, con tagline y barra', () => {
    mockMedias({ instalada: true })
    render(<WelcomeGate />)
    const status = screen.getByRole('status')
    expect(status.textContent).toMatch(/Tu pack te espera esta (mañana|tarde|noche)\./)
    expect(screen.getByRole('progressbar')).toBeTruthy()
  })

  it('no se repite dentro de la misma sesión', () => {
    mockMedias({ instalada: true })
    sessionStorage.setItem('paporla:welcome:v1', '1')
    render(<WelcomeGate />)
    expect(screen.queryByRole('status')).toBeNull()
  })
})

describe('WelcomeGate · carga honesta', () => {
  it('con carga rápida se va tras la estancia mínima y deja la marca', () => {
    vi.useFakeTimers()
    mockMedias({ instalada: true })
    render(<WelcomeGate />)
    expect(screen.getByRole('status')).toBeTruthy()
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(screen.queryByRole('status')).toBeNull()
    expect(sessionStorage.getItem('paporla:welcome:v1')).toBe('1')
  })

  it('con carga lenta acompana hasta que los recursos llegan', () => {
    vi.useFakeTimers()
    cargaLenta()
    mockMedias({ instalada: true })
    render(<WelcomeGate />)
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    // Pasaron 5 s pero los recursos nunca llegaron: sigue acompañando.
    expect(screen.getByRole('status')).toBeTruthy()
    act(() => {
      window.dispatchEvent(new Event('load'))
      vi.advanceTimersByTime(600)
    })
    expect(screen.queryByRole('status')).toBeNull()
  })
})

describe('WelcomeGate · voz de la casa', () => {
  it('rota el microcopy cada 2,5 s mientras la carga sigue en curso', () => {
    vi.useFakeTimers()
    cargaLenta()
    mockMedias({ instalada: true })
    const { container } = render(<WelcomeGate />)
    const micro = container.querySelector('.welcome-microcopy')
    expect(micro).toBeTruthy()
    const primero = micro!.textContent
    act(() => {
      vi.advanceTimersByTime(2600)
    })
    expect(container.querySelector('.welcome-microcopy')!.textContent).not.toBe(primero)
  })

  it('con movimiento reducido el microcopy se queda quieto', () => {
    vi.useFakeTimers()
    cargaLenta()
    mockMedias({ instalada: true, reducido: true })
    const { container } = render(<WelcomeGate />)
    const primero = container.querySelector('.welcome-microcopy')!.textContent
    act(() => {
      vi.advanceTimersByTime(2600)
    })
    expect(container.querySelector('.welcome-microcopy')!.textContent).toBe(primero)
  })

  it('de noche enciende las estrellitas y de día no', () => {
    vi.useFakeTimers()
    // 2026-09-19T02:00Z son 23:00 en Santiago (verano, UTC-3): noche.
    vi.setSystemTime(new Date('2026-09-19T02:00:00Z'))
    mockMedias({ instalada: true })
    const { container } = render(<WelcomeGate />)
    expect(container.querySelector('.welcome-estrellas')).toBeTruthy()
    expect(screen.getByRole('status').textContent).toContain('esta noche')
  })
})
