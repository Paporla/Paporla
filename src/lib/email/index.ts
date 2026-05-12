import { Resend } from 'resend'
import { welcomeTemplate, reservationConfirmationTemplate, passwordResetTemplate, pickupReminderTemplate } from './templates'

// ============================================
// Configuracion
// ============================================
const resend = new Resend(process.env.RESEND_API_KEY)
const senderEmail = process.env.RESEND_FROM_EMAIL || 'noreply@paporla.com'

// ============================================
// Tipos
// ============================================
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

// ============================================
// Funciones de envio
// ============================================

export async function sendWelcomeEmail(email: string, name: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: `Paporla <${senderEmail}>`,
      to: email,
      subject: `Bienvenido a Paporla! ${name} - Rescata comida, ayuda al planeta`,
      html: welcomeTemplate(name),
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
      subject: `Reserva confirmada! ${data.packTitle} - Codigo: ${data.pickupCode}`,
      html: reservationConfirmationTemplate(data),
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
      subject: `Recoge tu pack hoy! ${data.packTitle}`,
      html: pickupReminderTemplate(data),
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
      subject: 'Restablece tu contrasena en Paporla',
      html: passwordResetTemplate(resetLink),
    })
    if (error) { console.error('[Email Error] Reset:', error); return { success: false, error } }
    console.log('[Email Sent] Reset to:', email)
    return { success: true, data }
  } catch (err) { console.error('[Email Exception] Reset:', err); return { success: false, error: err } }
}
