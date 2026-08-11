import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import {
  welcomeTemplate,
  reservationConfirmationTemplate,
  passwordResetTemplate,
  pickupReminderTemplate,
} from '@/lib/email/templates'
import { sendEmailSchema } from '@/lib/utils/validations'
import { logger } from '@/lib/logger'

const resend = new Resend(process.env.RESEND_API_KEY)
const senderEmail = process.env.RESEND_FROM_EMAIL ?? 'noreply@paporla.com'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
    }

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ success: false, error: 'Cuerpo de solicitud inválido' }, { status: 400 })
    }

    const parsed = sendEmailSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' },
        { status: 400 },
      )
    }
    const { type, email, data: emailData } = parsed.data

    const isSystemEmail = email === user.email
    if (!isSystemEmail) {
      return NextResponse.json(
        { success: false, error: 'Solo puedes enviar emails a tu propia dirección' },
        { status: 403 },
      )
    }

    const safeData = emailData ?? {}

    let subject = ''
    let html = ''
    let text = ''

    switch (type) {
      case 'welcome':
        subject = 'Bienvenido a Paporla - Rescate Alimentario'
        html = welcomeTemplate(String(safeData.name ?? 'Usuario'))
        text = `Bienvenido a Paporla, ${String(safeData.name ?? 'Usuario')}! Gracias por unirte a la comunidad que esta cambiando la forma de alimentarnos. Explora packs disponibles en nuestra web.`
        break

      case 'reservation':
        subject = `Tu reserva de ${String(safeData.packTitle ?? 'Pack')} esta confirmada - Paporla`
        html = reservationConfirmationTemplate({
          userName: String(safeData.userName ?? 'Usuario'),
          packTitle: String(safeData.packTitle ?? 'Pack'),
          shopName: String(safeData.shopName ?? 'Comercio'),
          shopAddress: safeData.shopAddress ? String(safeData.shopAddress) : null,
          pickupCode: String(safeData.pickupCode ?? 'XXXXXX'),
          pickupDate: safeData.pickupDate ? String(safeData.pickupDate) : null,
          pickupTime: safeData.pickupTime ? String(safeData.pickupTime) : null,
          price: String(safeData.price ?? ''),
        })
        text = `Tu reserva esta confirmada. Pack: ${String(safeData.packTitle ?? 'Pack')}. Comercio: ${String(safeData.shopName ?? 'Comercio')}. Codigo de recogida: ${String(safeData.pickupCode ?? 'XXXXXX')}.`
        break

      case 'password_reset':
        subject = 'Restablece tu contraseña - Paporla'
        html = passwordResetTemplate(String(safeData.resetLink ?? ''))
        text = `Recibimos una solicitud para restablecer tu contraseña. Haz clic en este enlace: ${safeData.resetLink ?? ''}`
        break

      case 'pickup_reminder':
        subject = `Recuerda recoger tu pack de ${String(safeData.packTitle ?? 'Pack')} hoy - Paporla`
        html = pickupReminderTemplate({
          userName: String(safeData.userName ?? 'Usuario'),
          packTitle: String(safeData.packTitle ?? 'Pack'),
          shopName: String(safeData.shopName ?? 'Comercio'),
          shopAddress: safeData.shopAddress ? String(safeData.shopAddress) : null,
          pickupCode: String(safeData.pickupCode ?? 'XXXXXX'),
          pickupDate: String(safeData.pickupDate ?? ''),
          pickupTime: safeData.pickupTime ? String(safeData.pickupTime) : null,
        })
        text = `Recuerda recoger tu pack hoy. Pack: ${String(safeData.packTitle ?? 'Pack')}. Comercio: ${String(safeData.shopName ?? 'Comercio')}. Codigo: ${String(safeData.pickupCode ?? 'XXXXXX')}.`
        break
    }

    const { data: res, error } = await resend.emails.send({
      from: `Paporla <${senderEmail}>`,
      to: email,
      subject,
      html,
      text,
      headers: {
        'X-Priority': '3',
        'X-Mailer': 'Paporla',
      },
    })

    if (error) {
      logger.error('Email API', error, { type })
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    logger.info('Email API Sent', type)
    return NextResponse.json({ success: true, data: res })
  } catch (err: unknown) {
    logger.error('Email API Exception', err)
    const message = err instanceof Error ? err.message : 'Error interno del servidor'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
