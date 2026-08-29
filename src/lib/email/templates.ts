import {
  ctaButton,
  glowCodeBox,
  detailsCard,
  detailItem,
  infoBox,
  stepRow,
  baseLayout,
  separator,
  securityNote,
  EMAIL_CONFIG,
} from './components'
import { escapeHtml } from './escape'

const baseUrl = EMAIL_CONFIG.baseUrl
const primary = '#00ff88'

// ============================================
// BIENVENIDA
// ============================================
export function welcomeTemplate(name: string) {
  return baseLayout(
    `
<h1 style="color:#ffffff;font-size:22px;font-weight:800;margin:0 0 8px;text-align:center;line-height:1.3;">
  Bienvenido a Paporla
</h1>
<p style="color:#999999;font-size:14px;line-height:1.6;margin:0 0 26px;text-align:center;">
  Hola <strong style="color:#ffffff;">${escapeHtml(name)}</strong>, gracias por unirte a la comunidad<br>que esta cambiando la forma de alimentarnos.
</p>

${infoBox(`
<table width="100%" cellpadding="0" cellspacing="0" border="0">
${stepRow(1, 'Explora packs', 'Busca packs sorpresa con hasta 70% de descuento')}
${stepRow(2, 'Reserva', 'Elige tu pack favorito y reserva en segundos')}
${stepRow(3, 'Recoge y disfruta', 'Ve al comercio, muestra tu codigo y recoge')}
</table>
`)}

${ctaButton(` ${baseUrl}/packs`, 'Explorar packs disponibles')}

${separator()}

${securityNote('Cada pack que rescates ayuda a reducir el desperdicio de alimentos y apoya a los comercios locales de tu ciudad.')}`,
    'Bienvenido a Paporla',
  )
}

// ============================================
// CONFIRMACION DE RESERVA
// ============================================
export function reservationConfirmationTemplate(data: {
  userName: string
  packTitle: string
  shopName: string
  shopAddress: string | null
  pickupCode: string
  pickupDate: string | null
  pickupTime: string | null
  price: string
}) {
  return baseLayout(
    `
<h1 style="color:#ffffff;font-size:22px;font-weight:800;margin:0 0 8px;text-align:center;line-height:1.3;">
  Reserva confirmada
</h1>
<p style="color:#999999;font-size:14px;line-height:1.6;margin:0 0 26px;text-align:center;">
  Hola ${escapeHtml(data.userName)}, tu pack esta <strong style="color:${primary};">asegurado</strong>.<br>Presenta este codigo al llegar al comercio.
</p>

${glowCodeBox(escapeHtml(data.pickupCode), 'Tu codigo de recogida')}

<p style="color:#cccccc;font-size:14px;font-weight:600;margin:24px 0 12px;">Detalle de tu reserva</p>
${detailsCard(`
${detailItem('Pack', escapeHtml(data.packTitle))}
${detailItem('Comercio', escapeHtml(data.shopName))}
${data.shopAddress ? detailItem('Direccion', escapeHtml(data.shopAddress)) : ''}
${data.pickupDate ? detailItem('Recoger el', escapeHtml(data.pickupDate), true) : ''}
${data.pickupTime ? detailItem('Horario', escapeHtml(data.pickupTime)) : ''}
${detailItem('Total pagado', escapeHtml(data.price), true)}
`)}

<p style="color:#888888;font-size:12px;line-height:1.6;text-align:center;margin:16px 0 20px;">Recuerda pasar dentro del horario indicado.<br>Si no puedes asistir, cancela desde tu panel.</p>

${ctaButton(` ${baseUrl}/dashboard`, 'Ver mis reservas')}`,
    'Reserva confirmada',
  )
}

// ============================================
// RESTABLECER CONTRASENA
// ============================================
export function passwordResetTemplate(resetLink: string) {
  return baseLayout(
    `
<h1 style="color:#ffffff;font-size:22px;font-weight:800;margin:0 0 8px;text-align:center;line-height:1.3;">
  Restablece tu contrasena
</h1>
<p style="color:#999999;font-size:14px;line-height:1.6;margin:0 0 20px;text-align:center;">
  Recibimos una solicitud para restablecer<br>la contrasena de tu cuenta en <strong style="color:${primary};">Paporla</strong>.
</p>

${ctaButton(escapeHtml(resetLink), 'Restablecer contrasena')}

<p style="color:#777777;font-size:12px;line-height:1.6;margin:0 0 22px;text-align:center;">
  El enlace no funciona? Copia esta URL:<br>
  <a href="${escapeHtml(resetLink)}" style="color:${primary};word-break:break-all;font-size:11px;text-decoration:underline;">${escapeHtml(resetLink)}</a>
</p>

${separator()}

${securityNote('Si no solicitaste este cambio, ignora este mensaje. Nadie puede acceder a tu cuenta sin tu correo y contrasena.')}`,
    'Restablece tu contrasena',
  )
}

// ============================================
// RECORDATORIO DE RECOGIDA
// ============================================
export function pickupReminderTemplate(data: {
  userName: string
  packTitle: string
  shopName: string
  shopAddress: string | null
  pickupCode: string
  pickupDate: string
  pickupTime: string | null
}) {
  return baseLayout(
    `
<h1 style="color:#ffffff;font-size:22px;font-weight:800;margin:0 0 8px;text-align:center;line-height:1.3;">
  Recoge tu pack hoy
</h1>
<p style="color:#999999;font-size:14px;line-height:1.6;margin:0 0 26px;text-align:center;">
  Hola ${escapeHtml(data.userName)}, tu pack te esta esperando.<br>No olvides pasar a recogerlo.
</p>

${glowCodeBox(escapeHtml(data.pickupCode), 'Tu codigo de recogida')}

<p style="color:#cccccc;font-size:14px;font-weight:600;margin:24px 0 12px;">Informacion de recogida</p>
${detailsCard(`
${detailItem('Pack', escapeHtml(data.packTitle))}
${detailItem('Comercio', escapeHtml(data.shopName))}
${data.shopAddress ? detailItem('Direccion', escapeHtml(data.shopAddress)) : ''}
${detailItem('Fecha limite', escapeHtml(data.pickupDate), true)}
${data.pickupTime ? detailItem('Horario', escapeHtml(data.pickupTime)) : ''}
`)}

<p style="color:#888888;font-size:12px;line-height:1.6;text-align:center;margin:16px 0 20px;">Si no puedes asistir, cancela desde tu panel<br>para que otro usuario pueda disfrutarlo.</p>

${ctaButton(` ${baseUrl}/dashboard`, 'Ver detalles')}`,
    'Recoge tu pack hoy',
  )
}
