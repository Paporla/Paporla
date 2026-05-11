import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const senderEmail = process.env.RESEND_FROM_EMAIL || 'noreply@paporla.com'
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://paporla.vercel.app'

const primaryColor = '#00ff88'
const primaryRgb = '0, 255, 136'

// ============================================
// TEMPLATES HTML (inline styles para email)
// ============================================

function baseLayout(content: string) {
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#000;padding:40px 20px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#0a0a0f;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.06);">
  <tr><td style="text-align:center;line-height:0;font-size:0;">
    <img src="${baseUrl}/images/banner-optimized.webp" alt="Paporla" style="width:100%;max-width:600px;height:auto;display:block;" width="600" />
  </td></tr>
  <tr><td style="padding:20px 20px 10px;text-align:center;background:linear-gradient(180deg,rgba(${primaryRgb},0.08) 0%,#0a0a0f 100%);">
    <img src="${baseUrl}/images/logo-transparent.png" alt="Paporla" style="width:48px;height:48px;display:inline-block;margin-bottom:8px;" width="48" height="48" />
    <h1 style="color:${primaryColor};margin:4px 0 2px;font-size:22px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">Paporla</h1>
    <p style="color:#666;font-size:12px;margin:0 0 4px;letter-spacing:1px;">Rescate Alimentario</p>
  </td></tr>
  <tr><td style="padding:30px 30px 20px;">
    ${content}
  </td></tr>
  <tr><td style="padding:20px 30px;text-align:center;border-top:1px solid rgba(255,255,255,0.06);">
    <p style="color:#444;font-size:11px;line-height:1.8;margin:0 0 8px;">Paporla &mdash; Rescate Alimentario<br>Caracas, Venezuela</p>
    <p style="color:#333;font-size:11px;margin:0;">Si tienes dudas, escr\u00EDbenos a <a href="mailto:hola@paporla.com" style="color:${primaryColor};text-decoration:none;">hola@paporla.com</a></p>
    <hr style="border:none;border-top:1px solid rgba(255,255,255,0.04);margin:16px 0;">
    <p style="color:#2a2a2a;font-size:10px;margin:0;">&copy; 2026 Paporla. Todos los derechos reservados.</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}

function button(href: string, text: string) {
  return `<table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr><td align="center" style="background:${primaryColor};border-radius:50px;">
<a href="${href}" style="display:inline-block;padding:14px 40px;background:${primaryColor};color:#000;text-decoration:none;border-radius:50px;font-size:15px;font-weight:700;letter-spacing:0.5px;box-shadow:0 4px 24px rgba(${primaryRgb},0.35);">${text}</a>
</td></tr></table>`
}

function welcomeTemplate(name: string) {
  return baseLayout(`
<h2 style="color:#fff;font-size:24px;margin:0 0 6px;text-align:center;">\u00A1Bienvenido, ${name}!</h2>
<p style="color:#999;font-size:14px;line-height:1.7;margin:0 0 8px;text-align:center;">Gracias por unirte a <strong style="color:${primaryColor};">Paporla</strong>.<br>Ahora formas parte del cambio para reducir el desperdicio alimentario.</p>
<div style="background:rgba(255,255,255,0.03);border-radius:12px;padding:20px;margin:20px 0;">
  <p style="margin:0 0 12px;color:#ccc;font-size:14px;font-weight:600;">\u{1F4A1} \u00BFC\u00F3mo funciona?</p>
  <table cellpadding="0" cellspacing="0">
    <tr><td style="width:28px;vertical-align:top;padding-right:10px;"><span style="display:inline-block;width:24px;height:24px;background:rgba(${primaryRgb},0.2);border-radius:50%;text-align:center;line-height:24px;color:${primaryColor};font-size:12px;font-weight:700;">1</span></td><td style="padding-bottom:12px;"><p style="margin:0;color:#aaa;font-size:13px;line-height:1.5;"><strong style="color:#fff;">Explora</strong> packs sorpresa de comercios locales</p></td></tr>
    <tr><td style="width:28px;vertical-align:top;padding-right:10px;"><span style="display:inline-block;width:24px;height:24px;background:rgba(${primaryRgb},0.2);border-radius:50%;text-align:center;line-height:24px;color:${primaryColor};font-size:12px;font-weight:700;">2</span></td><td style="padding-bottom:12px;"><p style="margin:0;color:#aaa;font-size:13px;line-height:1.5;"><strong style="color:#fff;">Reserva</strong> el que m\u00E1s te guste</p></td></tr>
    <tr><td style="width:28px;vertical-align:top;padding-right:10px;"><span style="display:inline-block;width:24px;height:24px;background:rgba(${primaryRgb},0.2);border-radius:50%;text-align:center;line-height:24px;color:${primaryColor};font-size:12px;font-weight:700;">3</span></td><td><p style="margin:0;color:#aaa;font-size:13px;line-height:1.5;"><strong style="color:#fff;">Recoge</strong> tu pedido y disfruta \u{1F331}</p></td></tr>
  </table>
</div>
<div style="text-align:center;margin:24px 0 8px;">${button(`${baseUrl}/packs`, 'Explorar packs disponibles')}</div>
<p style="color:#555;font-size:12px;text-align:center;margin:16px 0 0;line-height:1.6;">\u26A0\uFE0F Esta es una versi\u00F3n <strong>DEMO</strong>. No hay procesamiento de pagos reales.</p>
`)
}

function reservationTemplate(data: {
  userName: string
  packTitle: string
  shopName: string
  pickupCode: string
  price: string
}) {
  return baseLayout(`
<h2 style="color:#fff;font-size:24px;margin:0 0 6px;text-align:center;">\u2705 \u00A1Reserva Confirmada!</h2>
<p style="color:#999;font-size:14px;margin:0 0 4px;text-align:center;">Hola ${data.userName}, tu reserva est\u00E1 lista.</p>
<p style="color:#666;font-size:13px;margin:0;text-align:center;">Presenta tu c\u00F3digo de recogida en el comercio.</p>
<div style="background:rgba(${primaryRgb},0.08);border:1px solid rgba(${primaryRgb},0.2);border-radius:12px;padding:16px 20px;text-align:center;margin:20px 0;">
  <p style="margin:0 0 6px;color:#666;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">C\u00F3digo de recogida</p>
  <p style="margin:0;color:${primaryColor};font-size:30px;font-weight:700;font-family:'Courier New',Courier,monospace;letter-spacing:4px;">${data.pickupCode}</p>
</div>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
  <tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);"><span style="color:#888;font-size:13px;">Pack</span></td><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);text-align:right;"><span style="color:#fff;font-size:14px;">${data.packTitle}</span></td></tr>
  <tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);"><span style="color:#888;font-size:13px;">Comercio</span></td><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);text-align:right;"><span style="color:#fff;font-size:14px;">${data.shopName}</span></td></tr>
  <tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);"><span style="color:#888;font-size:13px;">Total</span></td><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);text-align:right;"><span style="color:${primaryColor};font-size:14px;font-weight:700;">${data.price}</span></td></tr>
</table>
<div style="text-align:center;margin:24px 0 8px;">${button(`${baseUrl}/dashboard`, 'Ver mis reservas')}</div>
<p style="color:#555;font-size:12px;text-align:center;margin:16px 0 0;line-height:1.6;">\u26A0\uFE0F Esta es una versi\u00F3n <strong>DEMO</strong>. No hay procesamiento de pagos reales.</p>
`)
}

function passwordResetTemplate(resetLink: string) {
  return baseLayout(`
<h2 style="color:#fff;font-size:24px;margin:0 0 6px;text-align:center;">\u{1F512} Restablece tu contrase\u00F1a</h2>
<p style="color:#999;font-size:14px;line-height:1.7;margin:0 0 20px;text-align:center;">Recibimos una solicitud para restablecer la contrase\u00F1a de tu cuenta en <strong style="color:${primaryColor};">Paporla</strong>.</p>
<div style="background:rgba(255,255,255,0.03);border-radius:12px;padding:20px;margin:20px 0;text-align:center;">
  <p style="margin:0 0 16px;color:#aaa;font-size:13px;line-height:1.6;">Haz clic en el bot\u00F3n de abajo para crear una nueva contrase\u00F1a.<br>Este enlace es seguro y expirar\u00E1 en <strong style="color:#fff;">1 hora</strong>.</p>
  ${button(resetLink, 'Restablecer contrase\u00F1a')}
</div>
<div style="background:rgba(255,200,0,0.06);border:1px solid rgba(255,200,0,0.15);border-radius:10px;padding:14px 18px;margin:20px 0;">
  <p style="margin:0;color:#cc9;font-size:12px;line-height:1.6;">\u26A0\uFE0F Si no solicitaste este cambio, ignora este mensaje.<br>Nadie puede acceder a tu cuenta sin tu correo y contrase\u00F1a.</p>
</div>
<p style="color:#555;font-size:12px;text-align:center;margin:16px 0 0;">\u00BFTienes problemas? <a href="mailto:hola@paporla.com" style="color:${primaryColor};text-decoration:none;">Cont\u00E1ctanos</a></p>
`)
}

// ============================================
// HANDLER PRINCIPAL
// ============================================

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, email, data } = body

    if (!email || !type) {
      return NextResponse.json({ error: 'Faltan campos: email y type son requeridos' }, { status: 400 })
    }

    let subject = ''
    let html = ''

    switch (type) {
      case 'welcome': {
        subject = '\u00A1Bienvenido a Paporla! \u{1F331}'
        html = welcomeTemplate(data?.name || 'Usuario')
        break
      }
      case 'reservation': {
        subject = `\u2705 Reserva confirmada - ${data?.packTitle || ''}`
        html = reservationTemplate(data)
        break
      }
      case 'password_reset': {
        subject = 'Restablece tu contrase\u00F1a en Paporla'
        html = passwordResetTemplate(data?.resetLink || '')
        break
      }
      default:
        return NextResponse.json({ error: 'Tipo de correo no v\u00E1lido' }, { status: 400 })
    }

    const { data: res, error } = await resend.emails.send({
      from: `Paporla <${senderEmail}>`,
      to: email,
      subject,
      html,
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

