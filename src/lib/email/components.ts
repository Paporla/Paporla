// ============================================
// Componentes HTML reutilizables para emails
// Estilo: Supabase confirm email — limpio, dark, profesional
// ============================================

const primary = '#00ff88'
const primaryRgb = '0, 255, 136'
const darkBorder = '#142e20'
const darkCardBg = '#0d1813'

export const EMAIL_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://paporla.com',
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? 'hola@paporla.com',
  companyAddress: process.env.NEXT_PUBLIC_COMPANY_ADDRESS ?? 'Santiago, Chile',
  currentYear: new Date().getFullYear(),
}

// ============================================
// Línea decorativa (puntos verdes)
// ============================================
function decorativeLine(opacity = '0.45') {
  return `<table align="center" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
    <tr>
      <td style="width:40px;height:2px;background-color:${darkBorder};border-radius:2px;font-size:0;line-height:0;">&nbsp;</td>
      <td style="width:40px;height:2px;background-color:rgba(${primaryRgb},${opacity});border-radius:2px;font-size:0;line-height:0;">&nbsp;</td>
      <td style="width:40px;height:2px;background-color:${darkBorder};border-radius:2px;font-size:0;line-height:0;">&nbsp;</td>
    </tr>
  </table>`
}

// ============================================
// Header común
// ============================================
function header() {
  return `<tr>
    <td bgcolor="#0a0a1a" style="background-color:#0a0a1a;padding:36px 30px 28px;text-align:center;border-bottom:1px solid ${darkBorder};">
      ${decorativeLine('1.0')}
      <table align="center" cellpadding="0" cellspacing="0" border="0" style="margin:16px auto 0;">
        <tr>
          <td style="text-align:center;">
            <span style="color:#ffffff;font-size:32px;font-weight:900;letter-spacing:3px;text-transform:uppercase;">PAPORLA</span><span style="color:${primary};font-size:32px;font-weight:700;">.</span>
          </td>
        </tr>
        <tr>
          <td style="text-align:center;padding-top:6px;">
            <span style="color:#777777;font-size:11px;letter-spacing:4px;text-transform:uppercase;">Rescate Alimentario</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>`
}

// ============================================
// Footer común
// ============================================
function footer() {
  return `<tr>
    <td style="padding:24px 30px;text-align:center;border-top:1px solid ${darkBorder};">
      ${decorativeLine('0.45')}
      <p style="color:#888888;font-size:10px;line-height:1.6;margin:12px 0 4px;letter-spacing:1px;text-transform:uppercase;">
        Paporla — Rescate Alimentario
      </p>
      <p style="color:#5a5a5a;font-size:9px;margin:0;">
        &copy; ${EMAIL_CONFIG.currentYear} Paporla. Todos los derechos reservados.
      </p>
    </td>
  </tr>`
}

// ============================================
// Layout base
// ============================================
export function baseLayout(content: string, title = 'Paporla') {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    @media only screen and (max-width: 600px) {
      .main-card { border-radius: 0 !important; }
      .px-base { padding-left: 22px !important; padding-right: 22px !important; }
      .header-px { padding-left: 22px !important; padding-right: 22px !important; }
      .footer-px { padding-left: 22px !important; padding-right: 22px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#000000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#000000;padding:40px 10px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" class="main-card" style="max-width:560px;background-color:#0a0a0f;border-radius:20px;overflow:hidden;border:1px solid ${darkBorder};">
          ${header()}
          <tr><td class="px-base" style="padding:32px 30px 20px;">${content}</td></tr>
          ${footer()}
        </table>
        <p style="color:#777777;font-size:11px;line-height:1.6;margin:18px 0 0;text-align:center;">
          &iquest;Tienes dudas? Escr&iacute;benos a
          <a href="mailto:${EMAIL_CONFIG.contactEmail}" style="color:${primary};text-decoration:underline;">${EMAIL_CONFIG.contactEmail}</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ============================================
// Botón CTA (bulletproof)
// ============================================
export function ctaButton(href: string, text: string) {
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 26px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" bgcolor="#00e079" style="border-radius:50px;">
              <a href="${href}" target="_blank" style="display:inline-block;padding:16px 44px;color:#000000;text-decoration:none;font-size:15px;font-weight:700;letter-spacing:0.5px;border-radius:50px;background-color:${primary};mso-padding-alt:0;">${text}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`
}

// ============================================
// Caja de código (pickup code)
// ============================================
export function glowCodeBox(code: string, label: string) {
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,rgba(${primaryRgb},0.12) 0%,rgba(${primaryRgb},0.04) 100%);border:1px solid rgba(${primaryRgb},0.25);border-radius:16px;margin:24px 0;">
    <tr>
      <td style="padding:20px 24px;text-align:center;">
        <p style="margin:0 0 8px;color:#888888;font-size:10px;text-transform:uppercase;letter-spacing:2px;font-weight:600;">${label}</p>
        <p style="margin:0;color:${primary};font-size:34px;font-weight:700;font-family:'Courier New',Courier,monospace;letter-spacing:5px;text-shadow:0 0 20px rgba(${primaryRgb},0.2);">${code}</p>
      </td>
    </tr>
  </table>`
}

// ============================================
// Caja de pasos / info
// ============================================
export function infoBox(rows: string) {
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${darkCardBg};border:1px solid ${darkBorder};border-radius:14px;margin:0 0 20px;">
    <tr><td style="padding:22px 22px 18px;">${rows}</td></tr>
  </table>`
}

export function stepRow(num: number, title: string, subtitle: string) {
  return `<tr>
    <td valign="top" style="width:36px;padding-bottom:14px;">
      <span style="display:inline-block;width:28px;height:28px;border-radius:50%;background-color:#143824;text-align:center;line-height:28px;color:${primary};font-size:13px;font-weight:700;">${num}</span>
    </td>
    <td style="padding-bottom:14px;">
      <p style="margin:0;color:#dddddd;font-size:14px;line-height:1.5;">
        <strong style="color:#ffffff;">${title}</strong><br>
        <span style="color:#888888;font-size:13px;">${subtitle}</span>
      </p>
    </td>
  </tr>`
}

// ============================================
// Detalle item (etiqueta + valor)
// ============================================
export function detailItem(label: string, value: string, highlight = false) {
  return `<tr>
    <td style="padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.04);"><span style="color:#777777;font-size:13px;">${label}</span></td>
    <td style="padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.04);text-align:right;"><span style="color:${highlight ? primary : '#e0e0e0'};font-size:14px;font-weight:${highlight ? '700' : '400'};">${value}</span></td>
  </tr>`
}

export function detailsCard(rows: string) {
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${darkCardBg};border:1px solid ${darkBorder};border-radius:12px;overflow:hidden;margin:20px 0;">${rows}</table>`
}

// ============================================
// Separador
// ============================================
export function separator() {
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;">
    <tr><td style="border-top:1px solid #1a1a24;font-size:0;line-height:0;">&nbsp;</td></tr>
  </table>`
}

// ============================================
// Nota de seguridad / aviso
// ============================================
export function securityNote(text: string) {
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#1a180d;border:1px solid #332d14;border-radius:10px;">
    <tr><td style="padding:14px 18px;"><p style="margin:0;color:#bbbb88;font-size:12px;line-height:1.6;">${text}</p></td></tr>
  </table>`
}
