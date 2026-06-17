import { Resend } from 'resend'
import * as Sentry from '@sentry/nextjs'
import {
  welcomeTemplate,
  reservationConfirmationTemplate,
  passwordResetTemplate,
  pickupReminderTemplate,
} from './templates'

const resend = new Resend(process.env.RESEND_API_KEY)
const senderEmail = process.env.RESEND_FROM_EMAIL || 'noreply@paporla.com'

const isDev = process.env.NODE_ENV === 'development'

function logDebug(...args: unknown[]) {
  if (isDev) {
    console.log('[Email]', ...args)
  }
}

function logError(context: string, error: unknown) {
  if (isDev) {
    console.error(`[Email Error] ${context}:`, error)
  }
  if (!isDev) {
    Sentry.captureException(error, { tags: { email_context: context } })
  }
}

export interface ReservationData {
  userName: string
  packTitle: string
  shopName: string
  shopAddress: string | null
  pickupCode: string
  pickupDate: string | null
  pickupTime: string | null
  price: string
}

export interface PickupReminderData {
  userName: string
  packTitle: string
  shopName: string
  shopAddress: string | null
  pickupCode: string
  pickupDate: string
  pickupTime: string | null
}

async function sendEmail(params: { to: string; subject: string; html: string; text: string }) {
  const { to, subject, html, text } = params
  try {
    const { data, error } = await resend.emails.send({
      from: `Paporla <${senderEmail}>`,
      to,
      subject,
      html,
      text,
    })
    if (error) {
      logError(subject, error)
      return { success: false, error }
    }
    logDebug('Sent:', subject, 'to:', to)
    return { success: true, data }
  } catch (err) {
    logError(subject, err)
    return { success: false, error: err }
  }
}

export async function sendWelcomeEmail(email: string, name: string) {
  return sendEmail({
    to: email,
    subject: 'Bienvenido a Paporla - Rescate Alimentario',
    html: welcomeTemplate(name),
    text: `Bienvenido a Paporla, ${name}! Gracias por unirte a la comunidad que esta cambiando la forma de alimentarnos. Explora packs disponibles en nuestra web.`,
  })
}

export async function sendReservationConfirmationEmail(email: string, data: ReservationData) {
  return sendEmail({
    to: email,
    subject: `Tu reserva de ${data.packTitle} esta confirmada - Paporla`,
    html: reservationConfirmationTemplate(data),
    text: `Tu reserva esta confirmada. Pack: ${data.packTitle}. Comercio: ${data.shopName}. Codigo de recogida: ${data.pickupCode}. Presenta este codigo al llegar al comercio.`,
  })
}

export async function sendPickupReminderEmail(email: string, data: PickupReminderData) {
  return sendEmail({
    to: email,
    subject: `Recuerda recoger tu pack de ${data.packTitle} hoy - Paporla`,
    html: pickupReminderTemplate(data),
    text: `Recuerda recoger tu pack hoy. Pack: ${data.packTitle}. Comercio: ${data.shopName}. Codigo: ${data.pickupCode}.`,
  })
}

export async function sendPasswordResetEmail(email: string, resetLink: string) {
  return sendEmail({
    to: email,
    subject: 'Restablece tu contraseña - Paporla',
    html: passwordResetTemplate(resetLink),
    text: `Recibimos una solicitud para restablecer tu contraseña. Haz clic en este enlace: ${resetLink}. Si no solicitaste este cambio, ignora este mensaje.`,
  })
}
