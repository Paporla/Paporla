import { Resend } from 'resend'
import { welcomeTemplate, reservationConfirmationTemplate, passwordResetTemplate, pickupReminderTemplate } from './templates'

const resend = new Resend(process.env.RESEND_API_KEY)
const senderEmail = process.env.RESEND_FROM_EMAIL || 'noreply@paporla.com'

export interface ReservationData {
  userName: string; packTitle: string; shopName: string
  shopAddress: string | null; pickupCode: string
  pickupDate: string | null; pickupTime: string | null; price: string
}

export interface PickupReminderData {
  userName: string; packTitle: string; shopName: string
  shopAddress: string | null; pickupCode: string
  pickupDate: string; pickupTime: string | null
}

export async function sendWelcomeEmail(email: string, name: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: `Paporla <${senderEmail}>`,
      to: email,
      subject: 'Bienvenido a Paporla - Rescate Alimentario',
      html: welcomeTemplate(name),
      text: `Bienvenido a Paporla, ${name}! Gracias por unirte a la comunidad que esta cambiando la forma de alimentarnos. Explora packs disponibles en nuestra web.`,
    })
    if (error) { console.error('[Email Error] Welcome:', error); return { success: false, error } }
    console.log('[Email Sent] Welcome to:', email)
    return { success: true, data }
  } catch (err) { console.error('[Email Exception] Welcome:', err); return { success: false, error: err } }
}

export async function sendReservationConfirmationEmail(email: string, data: ReservationData) {
  try {
    const { data: res, error } = await resend.emails.send({
      from: `Paporla <${senderEmail}>`,
      to: email,
      subject: `Tu reserva de ${data.packTitle} esta confirmada - Paporla`,
      html: reservationConfirmationTemplate(data),
      text: `Tu reserva esta confirmada. Pack: ${data.packTitle}. Comercio: ${data.shopName}. Codigo de recogida: ${data.pickupCode}. Presenta este codigo al llegar al comercio.`,
    })
    if (error) { console.error('[Email Error] Reservation:', error); return { success: false, error } }
    console.log('[Email Sent] Reservation to:', email)
    return { success: true, data: res }
  } catch (err) { console.error('[Email Exception] Reservation:', err); return { success: false, error: err } }
}

export async function sendPickupReminderEmail(email: string, data: PickupReminderData) {
  try {
    const { data: res, error } = await resend.emails.send({
      from: `Paporla <${senderEmail}>`,
      to: email,
      subject: `Recuerda recoger tu pack de ${data.packTitle} hoy - Paporla`,
      html: pickupReminderTemplate(data),
      text: `Recuerda recoger tu pack hoy. Pack: ${data.packTitle}. Comercio: ${data.shopName}. Codigo: ${data.pickupCode}.`,
    })
    if (error) { console.error('[Email Error] Reminder:', error); return { success: false, error } }
    console.log('[Email Sent] Reminder to:', email)
    return { success: true, data: res }
  } catch (err) { console.error('[Email Exception] Reminder:', err); return { success: false, error: err } }
}

export async function sendPasswordResetEmail(email: string, resetLink: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: `Paporla <${senderEmail}>`,
      to: email,
      subject: 'Restablece tu contrasena - Paporla',
      html: passwordResetTemplate(resetLink),
      text: `Recibimos una solicitud para restablecer tu contrasena. Haz clic en este enlace: ${resetLink}. Si no solicitaste este cambio, ignora este mensaje.`,
    })
    if (error) { console.error('[Email Error] Reset:', error); return { success: false, error } }
    console.log('[Email Sent] Reset to:', email)
    return { success: true, data }
  } catch (err) { console.error('[Email Exception] Reset:', err); return { success: false, error: err } }
}
