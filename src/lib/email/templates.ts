import { ctaButton, glowCodeBox, detailsCard, detailItem, infoBlock, stepRow, baseLayout } from './components'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://paporla.vercel.app'
const primary = '#00ff88'

// ============================================
// BIENVENIDA
// ============================================
export function welcomeTemplate(name: string) {
  return baseLayout(`
<h2 style="color:#fff;font-size:28px;margin:0 0 4px;text-align:center;font-weight:800;">Bienvenido a Paporla</h2>
<p style="color:#999;font-size:15px;line-height:1.7;margin:0 0 6px;text-align:center;">Hola <strong style="color:#fff;">${name}</strong>, gracias por unirte a la comunidad<br>que esta cambiando la forma de alimentarnos.</p>
<p style="color:#666;font-size:13px;line-height:1.6;margin:0 0 6px;text-align:center;">Cada pack que rescates ayuda a reducir el desperdicio<br>de alimentos y apoya a los comercios locales.</p>
${infoBlock('Como funciona', `
${stepRow(1, '<strong style="color:#fff;">Explora</strong> packs sorpresa de comercios locales con hasta <strong style="color:' + primary + ';">70% de descuento</strong>')}
${stepRow(2, '<strong style="color:#fff;">Reserva</strong> el que mas te guste en segundos, sin complicaciones')}
${stepRow(3, '<strong style="color:#fff;">Recoge</strong> tu pedido en el horario indicado y disfruta', true)}
`)}
<div style="text-align:center;margin:28px 0 8px;">${ctaButton(baseUrl + '/packs', 'Explorar packs disponibles')}</div>`)
}

// ============================================
// CONFIRMACION DE RESERVA
// ============================================
export function reservationConfirmationTemplate(data: { userName: string; packTitle: string; shopName: string; shopAddress: string | null; pickupCode: string; pickupDate: string | null; pickupTime: string | null; price: string }) {
  return baseLayout(`
<h2 style="color:#fff;font-size:28px;margin:0 0 4px;text-align:center;font-weight:800;">Reserva confirmada</h2>
<p style="color:#aaa;font-size:15px;margin:0 0 4px;text-align:center;">Hola ${data.userName}, tu pack esta <strong style="color:${primary};">asegurado</strong>.</p>
<p style="color:#666;font-size:13px;margin:0;text-align:center;">Presenta tu codigo unico en el comercio para recogerlo.</p>
${glowCodeBox(data.pickupCode, 'Tu codigo de recogida')}
<div style="text-align:center;margin:16px 0 4px;"><p style="color:#555;font-size:11px;margin:0;">Muestra este codigo al llegar al comercio</p></div>
<p style="color:#ccc;font-size:13px;font-weight:600;margin:24px 0 8px;">Detalle de tu reserva</p>
${detailsCard(`
${detailItem('Pack', data.packTitle)}
${detailItem('Comercio', data.shopName)}
${data.shopAddress ? detailItem('Direccion', data.shopAddress) : ''}
${data.pickupDate ? detailItem('Recoger el', data.pickupDate, true) : ''}
${data.pickupTime ? detailItem('Horario', data.pickupTime) : ''}
${detailItem('Total pagado', data.price, true)}
`)}
<p style="color:#666;font-size:12px;line-height:1.6;text-align:center;margin:16px 0 20px;">Recuerda pasar dentro del horario indicado.<br>Si no puedes asistir, cancela desde tu panel.</p>
<div style="text-align:center;margin:8px 0;">${ctaButton(baseUrl + '/dashboard', 'Ver mis reservas')}</div>`)
}

// ============================================
// RESTABLECER CONTRASENA
// ============================================
export function passwordResetTemplate(resetLink: string) {
  return baseLayout(`
<h2 style="color:#fff;font-size:28px;margin:0 0 4px;text-align:center;font-weight:800;">Restablece tu contrasena</h2>
<p style="color:#999;font-size:15px;line-height:1.7;margin:0 0 20px;text-align:center;">Recibimos una solicitud para restablecer la contrasena<br>de tu cuenta en <strong style="color:${primary};">Paporla</strong>.</p>
<div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:24px;margin:20px 0;text-align:center;">
<p style="margin:0 0 20px;color:#aaa;font-size:13px;line-height:1.6;">Haz clic en el boton de abajo para crear una nueva contrasena.<br>Este enlace es seguro y expirara en <strong style="color:#fff;">1 hora</strong>.</p>
${ctaButton(resetLink, 'Restablecer contrasena')}
</div>
<div style="background:rgba(255,200,0,0.05);border:1px solid rgba(255,200,0,0.12);border-radius:10px;padding:14px 18px;margin:20px 0;"><p style="margin:0;color:#cc9;font-size:12px;line-height:1.6;">Si no solicitaste este cambio, ignora este mensaje.<br>Nadie puede acceder a tu cuenta sin tu correo y contrasena.</p></div>
<p style="color:#555;font-size:12px;text-align:center;margin:16px 0 0;">Tienes problemas? <a href="mailto:hola@paporla.com" style="color:${primary};text-decoration:none;">Contactanos</a></p>`)
}

// ============================================
// RECORDATORIO DE RECOGIDA
// ============================================
export function pickupReminderTemplate(data: { userName: string; packTitle: string; shopName: string; shopAddress: string | null; pickupCode: string; pickupDate: string; pickupTime: string | null }) {
  return baseLayout(`
<h2 style="color:#fff;font-size:28px;margin:0 0 4px;text-align:center;font-weight:800;">Recoge tu pack hoy</h2>
<p style="color:#aaa;font-size:15px;margin:0 0 4px;text-align:center;">Hola ${data.userName}, tu pack te espera.</p>
<p style="color:#666;font-size:13px;margin:0;text-align:center;">No olvides pasar a recogerlo en el horario indicado.</p>
${glowCodeBox(data.pickupCode, 'Tu codigo de recogida')}
<p style="color:#ccc;font-size:13px;font-weight:600;margin:24px 0 8px;">Informacion de recogida</p>
${detailsCard(`
${detailItem('Pack', data.packTitle)}
${detailItem('Comercio', data.shopName)}
${data.shopAddress ? detailItem('Direccion', data.shopAddress) : ''}
${detailItem('Fecha limite', data.pickupDate, true)}
${data.pickupTime ? detailItem('Horario', data.pickupTime) : ''}
`)}
<p style="color:#666;font-size:12px;line-height:1.6;text-align:center;margin:16px 0 20px;">Si no puedes asistir, cancela desde tu panel<br>para que otro usuario pueda disfrutarlo.</p>
<div style="text-align:center;margin:8px 0;">${ctaButton(baseUrl + '/dashboard', 'Ver detalles')}</div>`)
}
