import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import BusinessProfileLayout from '@/components/business/profile/BusinessProfileLayout'

/**
 * A-54: el aviso de "en revisión" prometía dos cosas que la app no puede cumplir.
 *
 * Decía: *"Estamos revisando tu comercio, normalmente en 24-48 horas. Te avisaremos
 * en cuanto esté aprobado."*
 *
 * Ni hay SLA (la revisión es MANUAL: el panel de administración sigue pospuesto, así
 * que depende de que alguien la haga a mano) ni existe aviso automático de aprobación.
 * Un comercio se quedaba esperando una respuesta en dos días que podía no llegar nunca
 * — y encima sin forma de saber si seguía en cola.
 *
 * Estas pruebas fijan la regla de siempre: **la interfaz no promete lo que la app no
 * hace**. El aviso tiene que decir lo que SÍ pasa (se revisa a mano) y dar una salida
 * real (dónde mirar el estado y a quién preguntar).
 *
 * Se monta el layout entero con el estado `pending_review` porque `StatusNotice` es
 * interna; así se comprueba el texto que ve de verdad el comercio.
 */

function renderEnRevision() {
  return render(
    <BusinessProfileLayout
      activeTab="info"
      onTabChange={vi.fn()}
      shopName="Panadería Ñuñoa"
      completionPercentage={100}
      onPreview={vi.fn()}
      status="pending_review"
      statusReason={null}
      missingFields={[]}
      hasUnsavedChanges={false}
      onSubmitForReview={vi.fn()}
      onGoToTab={vi.fn()}
      submitting={false}
      shopExists
      termsRequired={false}
      termsChecked={false}
      onTermsCheckedChange={vi.fn()}
    >
      <div>contenido de la pestaña</div>
    </BusinessProfileLayout>,
  )
}

describe('Aviso de comercio en revisión (A-54)', () => {
  it('NO promete un plazo de 24-48 horas', () => {
    const { container } = renderEnRevision()
    expect(container.textContent ?? '').not.toMatch(/24\s*-\s*48/)
  })

  it('NO promete un aviso automático de aprobación', () => {
    const { container } = renderEnRevision()
    expect((container.textContent ?? '').toLowerCase()).not.toMatch(
      /te avisaremos|te notificaremos|te enviaremos un correo/,
    )
  })

  it('dice que está en revisión y que se revisa a mano', () => {
    const { container } = renderEnRevision()
    const texto = container.textContent ?? ''
    expect(texto).toMatch(/en revisión/i)
    expect(texto).toMatch(/revisamos a mano/i)
  })

  it('dice DÓNDE ver el estado, sin inventarse una notificación', () => {
    const { container } = renderEnRevision()
    expect(container.textContent ?? '').toMatch(/vuelve a esta página/i)
  })

  it('deja una forma real de preguntar', () => {
    renderEnRevision()
    const enlace = screen.getAllByRole('link').find((a) => (a.getAttribute('href') ?? '').startsWith('mailto:'))
    expect(enlace).toBeTruthy()
    expect(enlace?.getAttribute('href')).toContain('hola@paporla.com')
  })

  it('un comercio verificado NO ve ningún aviso de revisión', () => {
    const { container } = render(
      <BusinessProfileLayout
        activeTab="info"
        onTabChange={vi.fn()}
        shopName="Panadería Ñuñoa"
        completionPercentage={100}
        onPreview={vi.fn()}
        status="verified"
        statusReason={null}
        missingFields={[]}
        hasUnsavedChanges={false}
        onSubmitForReview={vi.fn()}
        onGoToTab={vi.fn()}
        submitting={false}
        shopExists
        termsRequired={false}
        termsChecked={false}
        onTermsCheckedChange={vi.fn()}
      >
        <div>contenido de la pestaña</div>
      </BusinessProfileLayout>,
    )
    expect(container.textContent ?? '').not.toMatch(/en revisión/i)
  })
})
