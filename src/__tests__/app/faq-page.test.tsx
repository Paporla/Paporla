import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import FAQPage from '@/app/(public)/faq/page'

/**
 * L-45 (auditoría externa A-02, A-08, A-20, A-54, A-74): la FAQ pública prometía funciones que no
 * existen — billetera virtual con retiros a cuenta bancaria, comisión "que se descuenta
 * automáticamente", un código de recogida "de 6 dígitos" y un botón "Chat en vivo" sin manejador.
 *
 * L-64 (2026-09-15, pasada sobre lo anterior): el arreglo de A-08 cambió "6 dígitos" por el formato
 * real `P4P-XXXXXXXX`, pero dejó intacta la PROMESA ("recibirás un código... que deberás presentar
 * al llegar"). Y esa promesa tampoco se puede cumplir: el código se genera al confirmar el comercio
 * (0031:82), se le enseña al comercio UNA SOLA VEZ y en la base solo queda su huella SHA-256
 * (`reservations.pickup_code_hash`, 0005:34 y 0031:91). Ninguna pantalla del cliente lo pinta y los
 * correos que lo llevaban están bloqueados hasta empresa + MercadoPago. Se sustituye por el flujo
 * real de hoy: se recoge en el local, dentro de la franja, y el comercio busca la reserva a tu
 * nombre (`list_shop_reservations` devuelve `customer_display_name`).
 *
 * Regla que deja fijada este test: ningún texto de la interfaz puede prometer algo que la app no
 * haga hoy. Si alguien vuelve a escribir una de esas frases, el test falla y hay que discutirlo.
 *
 * Nota de montaje: el acordeón solo permite UNA respuesta abierta a la vez, así que se recorre
 * pregunta por pregunta y se acumula el texto. Las respuestas no están en el DOM hasta que se abren.
 */
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}))

/** Devuelve el número de preguntas y todo el texto visible al ir abriéndolas una a una. */
function abrirUnaAUna(container: HTMLElement): { preguntas: number; texto: string } {
  const botones = screen.getAllByRole('button').filter((b) => (b.textContent ?? '').includes('?'))
  let texto = ''
  botones.forEach((boton) => {
    fireEvent.click(boton)
    texto += container.textContent ?? ''
  })
  return { preguntas: botones.length, texto }
}

describe('FAQ pública — honestidad de los textos (L-45)', () => {
  it('no vuelve a escribir las promesas falsas de antes', () => {
    const { container } = render(<FAQPage />)
    const { preguntas, texto } = abrirUnaAUna(container)

    expect(preguntas).toBe(10)
    // Se buscan las frases PROMETIENDO, no las palabras sueltas: la respuesta honesta de hoy
    // menciona "billetera virtual" justamente para decir que no existirá.
    expect(texto).not.toContain('se acumulan en tu billetera virtual')
    expect(texto).not.toContain('solicitar un retiro a tu cuenta bancaria')
    expect(texto).not.toContain('Solo pagas una comisión por cada pack vendido')
    expect(texto).not.toContain('código único de 6 dígitos')
    // L-64: ni el formato viejo ni la promesa de recibir un código que el cliente no puede ver.
    expect(texto).not.toContain('recibirás un código de recogida')
    expect(texto).not.toContain('P4P-')
  })

  it('no tiene el botón muerto "Chat en vivo"', () => {
    render(<FAQPage />)

    expect(screen.queryByText('Chat en vivo')).not.toBeInTheDocument()
    // El único CTA de contacto que queda es el enlace real a /contacto.
    expect(screen.getByRole('link')).toHaveAttribute('href', '/contacto')
  })

  it('dice la verdad: recogida real, pagos no activos y verificación manual sin plazo', () => {
    const { container } = render(<FAQPage />)
    const { texto } = abrirUnaAUna(container)

    // L-64 (sustituye a A-08): el flujo de recogida que sí existe hoy. El comercio ve el nombre del
    // cliente en sus reservas (customer_display_name) y la pantalla del comercio filtra por él.
    expect(texto).toContain('Todas las recogidas son en el local del comercio')
    expect(texto).toContain('dentro de la franja horaria que elegiste al reservar')
    expect(texto).toContain('Al llegar, di tu nombre')
    // A-20: los pagos están bloqueados, así que se dice explícitamente que no hay cobro.
    expect(texto).toContain('los pagos dentro de la plataforma todavía no están activos')
    // A-02: el modelo decidido es la liquidación mensual (L-12), no una billetera.
    expect(texto).toContain('liquidación mensual por transferencia bancaria')
    // A-54: sin plazo automático que no se pueda cumplir.
    expect(texto).toContain('no tenemos un plazo automático')
  })

  it('mantiene lo que sí es cierto: cancelar hasta 2 horas antes de la ventana', () => {
    const { container } = render(<FAQPage />)
    const { texto } = abrirUnaAUna(container)

    // markets.cancellation_cutoff_minutes = 120 para Chile (0015) y cancel_reservation lo aplica.
    expect(texto).toContain('hasta 2 horas antes de que empiece la ventana de retiro')
  })
})
