import { describe, it, expect, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import OnboardingBanner from '@/components/onboarding/OnboardingBanner'

/**
 * L-64 (2026-09-15): el paso 3 del cartel de bienvenida decía "Ve al comercio, muestra tu código y
 * recoge". El cliente NO tiene ningún código que mostrar: el código se genera cuando el comercio
 * confirma (0031:82), se le enseña al comercio UNA SOLA VEZ y en la base solo queda su huella
 * SHA-256 (`reservations.pickup_code_hash`, 0005:34 y 0031:91). No hay ninguna pantalla del cliente
 * que lo pinte y los correos que lo llevaban están bloqueados hasta empresa + MercadoPago.
 *
 * Regla que fija este test (la misma que L-45 en la FAQ): ningún texto de la interfaz puede
 * prometer algo que la app no haga hoy. Si alguien vuelve a escribir "muestra tu código", falla.
 *
 * Montaje: el cartel arranca oculto y se hace visible en un `setTimeout(..., 0)` dentro del efecto,
 * así que las aserciones van con `findBy` (nunca a pelo). `isUserOnboardingDismissed()` devuelve
 * false con el localStorage vacío de jsdom, que es justo el caso que queremos pintar.
 */
describe('OnboardingBanner del usuario — honestidad de los textos (L-64)', () => {
  // jsdom comparte el localStorage entre tests del mismo archivo: si el del descarte se queda
  // puesto, los siguientes tests no verían el cartel y pasarían en falso.
  afterEach(() => {
    window.localStorage.clear()
  })

  it('pinta los 3 pasos de la historia', async () => {
    render(<OnboardingBanner />)

    expect(await screen.findByText('Explora packs')).toBeInTheDocument()
    expect(screen.getByText('Reserva')).toBeInTheDocument()
    expect(screen.getByText('Recoge y disfruta')).toBeInTheDocument()
  })

  it('no promete un código de recogida que el cliente no puede ver', async () => {
    const { container } = render(<OnboardingBanner />)

    await screen.findByText('Recoge y disfruta')

    const texto = container.textContent ?? ''
    expect(texto).not.toContain('muestra tu código')
    expect(texto).not.toContain('P4P-')
    // El gesto real de hoy: decir el nombre en el local, dentro de la franja.
    expect(texto).toContain('da tu nombre')
  })

  it('no se pinta si el usuario ya cerró el cartel antes', () => {
    window.localStorage.setItem('paporla_onboarding_user_dismissed', 'true')

    render(<OnboardingBanner />)

    expect(screen.queryByText('Recoge y disfruta')).not.toBeInTheDocument()
  })
})
