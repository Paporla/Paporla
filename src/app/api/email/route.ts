import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { welcomeTemplate, reservationConfirmationTemplate, passwordResetTemplate, pickupReminderTemplate } from '@/lib/email/templates'

const resend = new Resend(process.env.RESEND_API_KEY)
const senderEmail = process.env.RESEND_FROM_EMAIL || 'noreply@paporla.com'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { type, email, data } = body

    if (!email || !type) {
      return NextResponse.json({ error: 'Faltan campos: email y type son requeridos' }, { status: 400 })
    }

    const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).maybeSingle()
    const isSystemEmail = email === user.email
    const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'
    const isBusiness = profile?.role === 'comercio'

    if (!isSystemEmail && !isAdmin && !isBusiness) {
      return NextResponse.json({ error: 'No tienes permiso para enviar emails a otros usuarios' }, { status: 403 })
    }

    let subject = ''
    let html = ''
    let text = ''

    if (type === 'welcome') {
      subject = 'Bienvenido a Paporla - Rescate Alimentario'
      html = welcomeTemplate(data?.name || 'Usuario')
      text = `Bienvenido a Paporla, ${data?.name || 'Usuario'}!\n\nGracias por unirte a la comunidad que esta cambiando la forma de alimentarnos.\n\nExplora packs disponibles en nuestra web.`
    } else if (type === 'reservation') {
      subject = `Tu reserva de ${data?.packTitle || 'Pack'} esta confirmada - Paporla`
      html = reservationConfirmationTemplate({
        userName: data?.userName || 'Usuario',
        packTitle: data?.packTitle || 'Pack',
        shopName: data?.shopName || 'Comercio',
        shopAddress: data?.shopAddress || null,
        pickupCode: data?.pickupCode || 'XXXXXX',
        pickupDate: data?.pickupDate || null,
        pickupTime: data?.pickupTime || null,
        price: data?.price || '',
      })
      text = `Tu reserva esta confirmada.\n\nPack: ${data?.packTitle || 'Pack'}\nComercio: ${data?.shopName || 'Comercio'}\nCodigo de recogida: ${data?.pickupCode || 'XXXXXX'}\n\nPresenta este codigo al llegar al comercio.`
    } else if (type === 'password_reset') {
      subject = 'Restablece tu contrasena - Paporla'
      html = passwordResetTemplate(data?.resetLink || '')
      text = `Recibimos una solicitud para restablecer tu contrasena.\n\nHaz clic en este enlace: ${data?.resetLink || ''}\n\nSi no solicitaste este cambio, ignora este mensaje.`
    } else if (type === 'pickup_reminder') {
      subject = `Recuerda recoger tu pack de ${data?.packTitle || 'Pack'} hoy - Paporla`
      html = pickupReminderTemplate({
        userName: data?.userName || 'Usuario',
        packTitle: data?.packTitle || 'Pack',
        shopName: data?.shopName || 'Comercio',
        shopAddress: data?.shopAddress || null,
        pickupCode: data?.pickupCode || 'XXXXXX',
        pickupDate: data?.pickupDate || '',
        pickupTime: data?.pickupTime || null,
      })
      text = `Recuerda recoger tu pack hoy.\n\nPack: ${data?.packTitle || 'Pack'}\nComercio: ${data?.shopName || 'Comercio'}\nCodigo: ${data?.pickupCode || 'XXXXXX'}`
    } else {
      return NextResponse.json({ error: 'Tipo de correo no valido' }, { status: 400 })
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
      console.error(`[Email API Error] ${type}:`, error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    console.log(`[Email API Sent] ${type} to:`, email)
    return NextResponse.json({ success: true, data: res })
  } catch (err: any) {
    console.error('[Email API Exception]:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
