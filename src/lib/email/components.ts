// ============================================
// Configuracion centralizada de emails
// ============================================

export const EMAIL_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://paporla.com',
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? 'hola@paporla.com',
  companyName: 'Paporla',
  companySlogan: 'Rescate Alimentario',
  companyAddress: process.env.NEXT_PUBLIC_COMPANY_ADDRESS ?? 'Santiago, Chile',
  currentYear: new Date().getFullYear(),
  socialLinks: {
    instagram: 'https://instagram.com/paporla',
  },
}

// ============================================
// Componentes HTML reutilizables para emails
// ============================================

const primary = '#00ff88'
const primaryRgb = '0, 255, 136'

function getFooter() {
  const { baseUrl, contactEmail, companyName, companySlogan, companyAddress, currentYear } = EMAIL_CONFIG
  return `
<tr><td style="padding:24px 32px;text-align:center;border-top:1px solid rgba(255,255,255,0.05);background:rgba(255,255,255,0.02);">
<p style="color:#444;font-size:11px;line-height:1.8;margin:0 0 12px;">${companyName} &mdash; ${companySlogan}<br>${companyAddress}</p>
<p style="margin:0 0 16px;">
<a href="${baseUrl}" style="color:#555;text-decoration:none;font-size:11px;margin:0 8px;">Web</a>
<span style="color:#333;font-size:11px;">&middot;</span>
<a href="${baseUrl}/faq" style="color:#555;text-decoration:none;font-size:11px;margin:0 8px;">FAQ</a>
<span style="color:#333;font-size:11px;">&middot;</span>
<a href="mailto:${contactEmail}" style="color:${primary};text-decoration:none;font-size:11px;margin:0 8px;">Contacto</a>
</p>
<p style="color:#333;font-size:10px;margin:0;line-height:1.6;">&copy; ${currentYear} ${companyName}. Todos los derechos reservados.<br>Si no solicitaste este correo, ignoralo.</p>
</td></tr>`
}

export function baseLayout(content: string) {
  const { baseUrl } = EMAIL_CONFIG
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Paporla</title></head>
<body style="margin:0;padding:0;background:#000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#000;padding:30px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#0a0a0f;border-radius:20px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);box-shadow:0 20px 60px rgba(0,0,0,0.5);">
<tr><td style="text-align:center;line-height:0;font-size:0;">
<img src="${baseUrl}/images/banner-optimized.webp" alt="Paporla" style="width:100%;max-width:600px;height:auto;display:block;" width="600" />
</td></tr>
<tr><td style="padding:36px 32px 24px;">${content}</td></tr>
${getFooter()}
</table>
</td></tr>
</table>
</body>
</html>`
}

export function ctaButton(href: string, text: string) {
  return `<table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr><td align="center" style="border-radius:50px;background:${primary};padding:0;">
<a href="${href}" style="display:inline-block;padding:15px 44px;background:${primary};color:#000;text-decoration:none;border-radius:50px;font-size:15px;font-weight:700;letter-spacing:0.5px;box-shadow:0 4px 24px rgba(${primaryRgb},0.4);">${text}</a>
</td></tr></table>`
}

export function glowCodeBox(code: string, label: string) {
  return `<div style="background:linear-gradient(135deg,rgba(${primaryRgb},0.12) 0%,rgba(${primaryRgb},0.04) 100%);border:1px solid rgba(${primaryRgb},0.25);border-radius:16px;padding:20px 24px;text-align:center;margin:24px 0;box-shadow:0 0 40px rgba(${primaryRgb},0.08);">
<p style="margin:0 0 8px;color:#888;font-size:10px;text-transform:uppercase;letter-spacing:2px;font-weight:600;">${label}</p>
<p style="margin:0;color:${primary};font-size:34px;font-weight:700;font-family:'Courier New',Courier,'Fira Code',monospace;letter-spacing:5px;text-shadow:0 0 20px rgba(${primaryRgb},0.2);">${code}</p>
</div>`
}

export function detailItem(label: string, value: string, highlight = false) {
  return `<tr>
<td style="padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.04);"><span style="color:#777;font-size:13px;">${label}</span></td>
<td style="padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.04);text-align:right;"><span style="color:${highlight ? primary : '#e0e0e0'};font-size:14px;font-weight:${highlight ? '700' : '400'};">${value}</span></td>
</tr>`
}

export function detailsCard(rows: string) {
  return `<div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:12px;overflow:hidden;margin:20px 0;"><table width="100%" cellpadding="0" cellspacing="0">${rows}</table></div>`
}

export function infoBlock(title: string, items: string) {
  return `<div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:20px;margin:20px 0;">
<p style="margin:0 0 16px;color:#ccc;font-size:14px;font-weight:600;">${title}</p>
<table cellpadding="0" cellspacing="0">${items}</table>
</div>`
}

export function stepRow(num: number, text: string, last = false) {
  return `<tr>
<td style="width:32px;vertical-align:top;padding-right:12px;"><span style="display:inline-block;width:28px;height:28px;background:rgba(${primaryRgb},0.15);border-radius:50%;text-align:center;line-height:28px;color:${primary};font-size:13px;font-weight:700;">${num}</span></td>
<td style="padding-bottom:${last ? '0' : '14'}px;"><p style="margin:0;color:#aaa;font-size:13px;line-height:1.6;">${text}</p></td>
</tr>`
}
