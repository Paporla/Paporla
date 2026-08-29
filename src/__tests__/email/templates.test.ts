import { describe, it, expect } from 'vitest'
import { welcomeTemplate, reservationConfirmationTemplate, pickupReminderTemplate } from '@/lib/email/templates'

/**
 * F8.5 (S1): todo valor dinamico de un email (nombre de usuario, pack,
 * comercio, direccion, codigo) debe llegar ESCAPADO. Un comercio
 * malicioso podia inyectar HTML en el email de otro usuario (phishing con
 * la marca Paporla). Estos tests fijan ese contrato.
 *
 * (f8.5 S6 elimino passwordResetTemplate: el tipo password_reset ya no
 * existe en la API de emails.)
 */

const PAYLOAD_IMG = '<img src=x onerror="alert(1)">'
const PAYLOAD_SCRIPT = '<script>alert(1)</script>'

describe('templates de email — escape de valores dinamicos', () => {
  it('welcome: un nombre con <script> queda neutralizado', () => {
    const html = welcomeTemplate(PAYLOAD_SCRIPT)
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).not.toContain(PAYLOAD_SCRIPT)
  })

  it('reservation: pack/comercio/direccion con HTML quedan neutralizados y lo normal se conserva', () => {
    const html = reservationConfirmationTemplate({
      userName: 'Ana & Pablo',
      packTitle: PAYLOAD_IMG,
      shopName: PAYLOAD_SCRIPT,
      shopAddress: 'Calle A & B 123',
      pickupCode: 'P4P-1234',
      pickupDate: '30/09/2026',
      pickupTime: '15:00',
      price: '$3.990',
    })
    expect(html).not.toContain('<img src=x')
    expect(html).not.toContain('<script>')
    expect(html).toContain('Ana &amp; Pablo')
    expect(html).toContain('Calle A &amp; B 123')
    expect(html).toContain('P4P-1234')
    expect(html).toContain('$3.990')
    expect(html).toContain('30/09/2026')
  })

  it('pickup_reminder: misma proteccion', () => {
    const html = pickupReminderTemplate({
      userName: PAYLOAD_IMG,
      packTitle: PAYLOAD_SCRIPT,
      shopName: 'Panadería Normal',
      shopAddress: null,
      pickupCode: 'P4P-9999',
      pickupDate: '30/09/2026',
      pickupTime: null,
    })
    expect(html).not.toContain('<img src=x')
    expect(html).not.toContain('<script>')
    expect(html).toContain('Panadería Normal')
    expect(html).toContain('P4P-9999')
  })

  it('valores normalitos se ven identicos al usuario (sin escaping visible)', () => {
    const html = welcomeTemplate('María')
    expect(html).toContain('>María</strong>')
    expect(html).not.toContain('&amp;')
  })
})
