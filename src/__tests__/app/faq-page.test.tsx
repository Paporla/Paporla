import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import FAQPage from '@/app/(public)/faq/page'

/**
 * L-45 (auditoría externa A-02, A-08, A-20, A-54, A-74): la FAQ pública prometía funciones que no
 * existen — billetera virtual con retiros a cuenta bancaria, comisión "que se descuenta
 * automáticamente", un código de recogida "de 6 dígitos" (el real es P4P-XXXXXXXX) y un botón
 * "Chat en vivo" sin manejador.
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
  })

  it('no tiene el botón muerto "Chat en vivo"', () => {
    render(<FAQPage />)

    expect(screen.queryByText('Chat en vivo')).not.toBeInTheDocument()
    // El único CTA de contacto que queda es el enlace real a /contacto.
    expect(screen.getByRole('link')).toHaveAttribute('href', '/contacto')
  })

  it('dice la verdad: código P4P-, pagos no activos y verificación manual sin plazo', () => {
    const { container } = render(<FAQPage />)
    const { texto } = abrirUnaAUna(container)

    // A-08: el formato real del código de recogida (migración 0031).
    expect(texto).toContain('P4P-XXXXXXXX')
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
