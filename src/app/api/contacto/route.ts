import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { contactFormTemplate } from '@/lib/email/templates'
import { contactFormSchema } from '@/lib/utils/validations'
import { logger } from '@/lib/logger'

/**
 * Formulario de contacto público (/contacto).
 *
 * A-03 (auditoría externa): antes la página esperaba 1,5 segundos con un
 * setTimeout y mostraba "¡Mensaje enviado! Te responderemos pronto" SIN
 * ENVIAR NADA. Quien escribía por un problema creía haber hablado con Paporla
 * y en realidad su mensaje se tiraba a la basura.
 *
 * Regla de oro de esta ruta: **nunca se devuelve éxito si el correo no salió.**
 * Si el servicio de email no está configurado o falla, se responde con error y
 * la página le ofrece al usuario la dirección real para que escriba por su
 * cuenta. Un "enviado" falso es peor que un error honesto.
 *
 * El límite de peticiones lo pone el middleware (routeLimits en
 * lib/middleware/rateLimit.ts), como al resto de rutas /api.
 */

const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? 'hola@paporla.com'
const senderEmail = process.env.RESEND_FROM_EMAIL ?? 'noreply@paporla.com'

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY
  return apiKey ? new Resend(apiKey) : null
}

export async function POST(request: Request) {
  try {
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ success: false, error: 'La solicitud no tiene el formato esperado' }, { status: 400 })
    }

    // Trampa para robots (honeypot): es un campo que la página esconde con CSS
    // y que una persona nunca rellena. Si viene con algo, es un bot: se acepta
    // la petición en silencio (sin correo) para no enseñarle qué ha fallado.
    if (typeof body.website === 'string' && body.website.trim() !== '') {
      logger.warn('Contacto', 'Descartado por honeypot')
      return NextResponse.json({ success: true, discarded: true })
    }

    const parsed = contactFormSchema.safeParse(body)
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]
      return NextResponse.json(
        {
          success: false,
          error: firstIssue?.message ?? 'Revisa los datos del formulario',
          field: firstIssue?.path?.[0] ?? undefined,
        },
        { status: 400 },
      )
    }

    const { name, email, subject, message } = parsed.data

    const resend = getResendClient()
    if (!resend) {
      // NO se finge éxito. Se avisa y se da la dirección real.
      logger.error('Contacto', 'RESEND_API_KEY no configurada: el mensaje no se puede enviar')
      return NextResponse.json(
        {
          success: false,
          error: 'El envío automático no está disponible ahora mismo.',
          fallbackEmail: contactEmail,
        },
        { status: 503 },
      )
    }

    const { error } = await resend.emails.send({
      from: `Paporla Web <${senderEmail}>`,
      to: contactEmail,
      // Quien recibe puede pulsar "Responder" y contesta directo al visitante.
      replyTo: email,
      subject: `[Contacto web] ${subject}`,
      html: contactFormTemplate({ name, email, subject, message }),
      text: `Nombre: ${name}\nEmail: ${email}\nAsunto: ${subject}\n\n${message}`,
      headers: {
        'X-Mailer': 'Paporla',
      },
    })

    if (error) {
      logger.error('Contacto', error)
      return NextResponse.json(
        {
          success: false,
          error: 'No se pudo enviar el mensaje. Inténtalo de nuevo en unos minutos.',
          fallbackEmail: contactEmail,
        },
        { status: 502 },
      )
    }

    logger.info('Contacto', 'Mensaje enviado', { subject })
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    logger.error('Contacto Excepcion', err)
    return NextResponse.json(
      {
        success: false,
        error: 'Ha ocurrido un error inesperado.',
        fallbackEmail: contactEmail,
      },
      { status: 500 },
    )
  }
}
