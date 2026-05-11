import { Resend } from 'resend';

// ============================================
// Configuracion
// ============================================
const resend = new Resend(process.env.RESEND_API_KEY);
const senderEmail = process.env.RESEND_FROM_EMAIL || 'noreply@paporla.com';
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://paporla.vercel.app';

const primary = '#00ff88';
const primaryRgb = '0, 255, 136';
const primaryDark = '#00cc6e';
const secondary = '#ff8a3c';

// ============================================
// Tipos
// ============================================
export interface ReservationData {
  userName: string;
  packTitle: string;
  shopName: string;
  shopAddress: string | null;
  pickupCode: string;
  pickupDate: string | null;
  pickupTime: string | null;
  price: string;
}

export interface PickupReminderData {
  userName: string;
  packTitle: string;
  shopName: string;
  shopAddress: string | null;
  pickupCode: string;
  pickupDate: string;
  pickupTime: string | null;
}

// ============================================
// Layout base premium
// ============================================
function baseLayout(content: string) {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Paporla</title>
</head>
<body style="margin:0; padding:0; background:#000; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#000; padding:30px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; background:#0a0a0f; border-radius:20px; overflow:hidden; border:1px solid rgba(255,255,255,0.08); box-shadow:0 20px 60px rgba(0,0,0,0.5);">

          <!-- HERO BANNER -->
          <tr>
            <td style="position:relative; text-align:center; line-height:0; font-size:0;">
              <div style="background:linear-gradient(135deg, rgba(${primaryRgb},0.15) 0%, transparent 50%, rgba(255,138,60,0.1) 100%); padding:40px 20px 30px;">
                <img src="${baseUrl}/images/logo-transparent.png" alt="Paporla"
                  style="width:56px; height:56px; display:inline-block; margin-bottom:12px;" width="56" height="56" />
                <h1 style="color:${primary}; margin:0 0 4px; font-size:26px; font-weight:800; letter-spacing:4px; text-transform:uppercase; text-shadow:0 0 30px rgba(${primaryRgb},0.3);">
                  Paporla
                </h1>
                <p style="color:#666; font-size:12px; margin:0; letter-spacing:2px; text-transform:uppercase;">
                  Rescate Alimentario
                </p>
              </div>
              <!-- Glow line -->
              <div style="height:3px; background:linear-gradient(90deg, transparent, ${primary}, transparent);"></div>
            </td>
          </tr>

          <!-- CONTENIDO -->
          <tr>
            <td style="padding:36px 32px 24px;">
              ${content}
            </td>
          </tr>

          <!-- IMPACT DIVIDER -->
          <tr>
            <td style="padding:0 32px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(${primaryRgb},0.04); border-radius:12px; border:1px solid rgba(${primaryRgb},0.1); padding:16px;">
                <tr>
                  <td style="text-align:center; width:33%; padding:8px 4px;">
                    <p style="margin:0; color:${primary}; font-size:18px; font-weight:800;">+2,847</p>
                    <p style="margin:4px 0 0; color:#555; font-size:10px; text-transform:uppercase; letter-spacing:0.5px;">Packs Rescatados</p>
                  </td>
                  <td style="text-align:center; width:33%; padding:8px 4px; border-left:1px solid rgba(255,255,255,0.05); border-right:1px solid rgba(255,255,255,0.05);">
                    <p style="margin:0; color:${primary}; font-size:18px; font-weight:800;">+3.4T</p>
                    <p style="margin:4px 0 0; color:#555; font-size:10px; text-transform:uppercase; letter-spacing:0.5px;">CO2 Evitado</p>
                  </td>
                  <td style="text-align:center; width:33%; padding:8px 4px;">
                    <p style="margin:0; color:${primary}; font-size:18px; font-weight:800;">15</p>
                    <p style="margin:4px 0 0; color:#555; font-size:10px; text-transform:uppercase; letter-spacing:0.5px;">Comercios Aliados</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER PREMIUM -->
          <tr>
            <td style="padding:24px 32px; text-align:center; border-top:1px solid rgba(255,255,255,0.05); background:rgba(255,255,255,0.02);">
              <p style="color:#444; font-size:11px; line-height:1.8; margin:0 0 12px;">
                Paporla &mdash; Rescate Alimentario<br>
                Caracas, Venezuela
              </p>
              <p style="margin:0 0 16px;">
                <a href="${baseUrl}" style="color:#555; text-decoration:none; font-size:11px; margin:0 8px;">Web</a>
                <span style="color:#333; font-size:11px;">&middot;</span>
                <a href="${baseUrl}/faq" style="color:#555; text-decoration:none; font-size:11px; margin:0 8px;">FAQ</a>
                <span style="color:#333; font-size:11px;">&middot;</span>
                <a href="mailto:hola@paporla.com" style="color:${primary}; text-decoration:none; font-size:11px; margin:0 8px;">Contacto</a>
              </p>
              <p style="color:#333; font-size:10px; margin:0; line-height:1.6;">
                &copy; 2026 Paporla. Todos los derechos reservados.<br>
                Si no solicitaste este correo, ignoralo.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

// ============================================
// Componentes reutilizables
// ============================================

function ctaButton(href: string, text: string) {
  return `
<table cellpadding="0" cellspacing="0" style="margin:0 auto;">
  <tr>
    <td align="center" style="border-radius:50px; background:${primary}; padding:0;">
      <a href="${href}"
        style="display:inline-block; padding:15px 44px; background:${primary}; color:#000; text-decoration:none;
        border-radius:50px; font-size:15px; font-weight:700; letter-spacing:0.5px;
        box-shadow:0 4px 24px rgba(${primaryRgb},0.4);">
        ${text}
      </a>
    </td>
  </tr>
</table>
`;
}

function glowCodeBox(code: string, label: string) {
  return `
<div style="background:linear-gradient(135deg, rgba(${primaryRgb},0.12) 0%, rgba(${primaryRgb},0.04) 100%); border:1px solid rgba(${primaryRgb},0.25); border-radius:16px; padding:20px 24px; text-align:center; margin:24px 0; box-shadow:0 0 40px rgba(${primaryRgb},0.08);">
  <p style="margin:0 0 8px; color:#888; font-size:10px; text-transform:uppercase; letter-spacing:2px; font-weight:600;">
    ${label}
  </p>
  <p style="margin:0; color:${primary}; font-size:34px; font-weight:700; font-family:'Courier New',Courier,'Fira Code',monospace; letter-spacing:5px; text-shadow:0 0 20px rgba(${primaryRgb},0.2);">
    ${code}
  </p>
</div>
`;
}

function detailItem(label: string, value: string, highlight = false) {
  return `
<tr>
  <td style="padding:12px 16px; border-bottom:1px solid rgba(255,255,255,0.04);">
    <span style="color:#777; font-size:13px;">${label}</span>
  </td>
  <td style="padding:12px 16px; border-bottom:1px solid rgba(255,255,255,0.04); text-align:right;">
    <span style="color:${highlight ? primary : '#e0e0e0'}; font-size:14px; font-weight:${highlight ? '700' : '400'};">${value}</span>
  </td>
</tr>
`;
}

function detailsCard(rows: string) {
  return `
<div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:12px; overflow:hidden; margin:20px 0;">
  <table width="100%" cellpadding="0" cellspacing="0">
    ${rows}
  </table>
</div>
`;
}

function infoBlock(title: string, items: string) {
  return `
<div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:12px; padding:20px; margin:20px 0;">
  <p style="margin:0 0 16px; color:#ccc; font-size:14px; font-weight:600;">${title}</p>
  <table cellpadding="0" cellspacing="0">
    ${items}
  </table>
</div>
`;
}

function stepRow(num: number, text: string, last = false) {
  return `
<tr>
  <td style="width:32px; vertical-align:top; padding-right:12px;">
    <span style="display:inline-block; width:28px; height:28px; background:rgba(${primaryRgb},0.15); border-radius:50%; text-align:center; line-height:28px; color:${primary}; font-size:13px; font-weight:700;">${num}</span>
  </td>
  <td style="padding-bottom:${last ? '0' : '14'}px;">
    <p style="margin:0; color:#aaa; font-size:13px; line-height:1.6;">${text}</p>
  </td>
</tr>
`;
}

// ============================================
// TEMPLATE: BIENVENIDA PREMIUM
// ============================================
function welcomeTemplate(name: string) {
  return `
<h2 style="color:#fff; font-size:28px; margin:0 0 4px; text-align:center; font-weight:800;">
  Bienvenido a bordo! &#x1F331;
</h2>
<p style="color:#999; font-size:15px; line-height:1.7; margin:0 0 6px; text-align:center;">
  Hola <strong style="color:#fff;">${name}</strong>, gracias por unirte a la comunidad<br>
  que esta cambiando la forma de alimentarnos.
</p>
<p style="color:#666; font-size:13px; line-height:1.6; margin:0 0 6px; text-align:center;">
  Cada pack que rescates ayuda a reducir el desperdicio<br>
  de alimentos y apoya a los comercios locales.
</p>

${infoBlock('Como funciona? &#x1F4A1;', `
  ${stepRow(1, '<strong style="color:#fff;">Explora</strong> packs sorpresa de comercios locales con hasta <strong style="color:${primary};">70% de descuento</strong>')}
  ${stepRow(2, '<strong style="color:#fff;">Reserva</strong> el que mas te guste en segundos, sin complicaciones')}
  ${stepRow(3, '<strong style="color:#fff;">Recoge</strong> tu pedido en el horario indicado y disfruta &#x1F60B;', true)}
`)}

<div style="text-align:center; margin:28px 0 8px;">
  ${ctaButton(`${baseUrl}/packs`, 'Explorar packs disponibles')}
</div>

<p style="color:#555; font-size:11px; text-align:center; margin:20px 0 0; line-height:1.6; border-top:1px solid rgba(255,255,255,0.04); padding-top:16px;">
  &#x26A0;&#xFE0F; Version <strong>DEMO</strong>. No hay procesamiento de pagos reales.
</p>
`;
}

// ============================================
// TEMPLATE: CONFIRMACION DE RESERVA PREMIUM
// ============================================
function reservationConfirmationTemplate(data: ReservationData) {
  return `
<h2 style="color:#fff; font-size:28px; margin:0 0 4px; text-align:center; font-weight:800;">
  &#x2705; Reserva Confirmada!
</h2>
<p style="color:#aaa; font-size:15px; margin:0 0 4px; text-align:center;">
  Hola ${data.userName}, tu pack esta <strong style="color:${primary};">asegurado</strong>.
</p>
<p style="color:#666; font-size:13px; margin:0; text-align:center;">
  Presenta tu codigo unico en el comercio para recogerlo.
</p>

${glowCodeBox(data.pickupCode, 'Tu codigo de recogida')}

<div style="text-align:center; margin:16px 0 4px;">
  <p style="color:#555; font-size:11px; margin:0;">
    &#x1F4F1; Muestra este codigo al llegar al comercio
  </p>
</div>

<p style="color:#ccc; font-size:13px; font-weight:600; margin:24px 0 8px;">&#x1F4CB; Detalle de tu reserva</p>

${detailsCard(`
  ${detailItem('Pack', data.packTitle)}
  ${detailItem('Comercio', data.shopName)}
  ${data.shopAddress ? detailItem('Direccion', data.shopAddress) : ''}
  ${data.pickupDate ? detailItem('Recoger el', data.pickupDate, true) : ''}
  ${data.pickupTime ? detailItem('Horario', data.pickupTime) : ''}
  ${detailItem('Total pagado', data.price, true)}
`)}

<p style="color:#666; font-size:12px; line-height:1.6; text-align:center; margin:16px 0 20px;">
  &#x1F4A1; Recuerda pasar dentro del horario indicado.<br>
  Si no puedes asistir, cancela desde tu panel.
</p>

<div style="text-align:center; margin:8px 0;">
  ${ctaButton(`${baseUrl}/dashboard`, 'Ver mis reservas')}
</div>

<p style="color:#555; font-size:11px; text-align:center; margin:20px 0 0; line-height:1.6; border-top:1px solid rgba(255,255,255,0.04); padding-top:16px;">
  &#x26A0;&#xFE0F; Version <strong>DEMO</strong>. No hay procesamiento de pagos reales.
</p>
`;
}

// ============================================
// TEMPLATE: RESTABLECER CONTRASENA PREMIUM
// ============================================
function passwordResetTemplate(resetLink: string) {
  return `
<h2 style="color:#fff; font-size:28px; margin:0 0 4px; text-align:center; font-weight:800;">
  &#x1F512; Restablece tu contrasena
</h2>
<p style="color:#999; font-size:15px; line-height:1.7; margin:0 0 20px; text-align:center;">
  Recibimos una solicitud para restablecer la contrasena<br>
  de tu cuenta en <strong style="color:${primary};">Paporla</strong>.
</p>

<div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:12px; padding:24px; margin:20px 0; text-align:center;">
  <p style="margin:0 0 20px; color:#aaa; font-size:13px; line-height:1.6;">
    Haz clic en el boton de abajo para crear una nueva contrasena.<br>
    Este enlace es seguro y expirara en <strong style="color:#fff;">1 hora</strong>.
  </p>
  ${ctaButton(resetLink, 'Restablecer contrasena')}
</div>

<div style="background:rgba(255,200,0,0.05); border:1px solid rgba(255,200,0,0.12); border-radius:10px; padding:14px 18px; margin:20px 0;">
  <p style="margin:0; color:#cc9; font-size:12px; line-height:1.6;">
    &#x26A0;&#xFE0F; Si no solicitaste este cambio, ignora este mensaje.<br>
    Nadie puede acceder a tu cuenta sin tu correo y contrasena.
  </p>
</div>

<p style="color:#555; font-size:12px; text-align:center; margin:16px 0 0;">
  Tienes problemas?
  <a href="mailto:hola@paporla.com" style="color:${primary}; text-decoration:none;">Contactanos</a>
</p>
`;
}

// ============================================
// TEMPLATE: RECORDATORIO DE RECOGIDA PREMIUM
// ============================================
function pickupReminderTemplate(data: PickupReminderData) {
  return `
<h2 style="color:#fff; font-size:28px; margin:0 0 4px; text-align:center; font-weight:800;">
  &#x23F0; Recoge tu pack hoy!
</h2>
<p style="color:#aaa; font-size:15px; margin:0 0 4px; text-align:center;">
  Hola ${data.userName}, tu pack te espera.
</p>
<p style="color:#666; font-size:13px; margin:0; text-align:center;">
  No olvides pasar a recogerlo en el horario indicado.
</p>

${glowCodeBox(data.pickupCode, 'Tu codigo de recogida')}

<p style="color:#ccc; font-size:13px; font-weight:600; margin:24px 0 8px;">&#x1F4CD; Informacion de recogida</p>

${detailsCard(`
  ${detailItem('Pack', data.packTitle)}
  ${detailItem('Comercio', data.shopName)}
  ${data.shopAddress ? detailItem('Direccion', data.shopAddress) : ''}
  ${detailItem('Fecha limite', data.pickupDate, true)}
  ${data.pickupTime ? detailItem('Horario', data.pickupTime) : ''}
`)}

<p style="color:#666; font-size:12px; line-height:1.6; text-align:center; margin:16px 0 20px;">
  &#x1F4A1; Si no puedes asistir, cancela desde tu panel<br>
  para que otro usuario pueda disfrutarlo.
</p>

<div style="text-align:center; margin:8px 0;">
  ${ctaButton(`${baseUrl}/dashboard`, 'Ver detalles')}
</div>
`;
}

// ============================================
// FUNCIONES DE ENVIO
// ============================================

export async function sendWelcomeEmail(email: string, name: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: `Paporla <${senderEmail}>`,
      to: email,
      subject: `Bienvenido a Paporla! ${name} - Rescata comida, ayuda al planeta`,
      html: welcomeTemplate(name),
    });
    if (error) {
      console.error('[Email Error] Welcome:', error);
      return { success: false, error };
    }
    console.log('[Email Sent] Welcome to:', email);
    return { success: true, data };
  } catch (err) {
    console.error('[Email Exception] Welcome:', err);
    return { success: false, error: err };
  }
}

export async function sendReservationConfirmationEmail(
  email: string,
  data: ReservationData
) {
  try {
    const { data: res, error } = await resend.emails.send({
      from: `Paporla <${senderEmail}>`,
      to: email,
      subject: `Reserva confirmada! ${data.packTitle} - Codigo: ${data.pickupCode}`,
      html: reservationConfirmationTemplate(data),
    });
    if (error) {
      console.error('[Email Error] Reservation:', error);
      return { success: false, error };
    }
    console.log('[Email Sent] Reservation to:', email);
    return { success: true, data: res };
  } catch (err) {
    console.error('[Email Exception] Reservation:', err);
    return { success: false, error: err };
  }
}

export async function sendPickupReminderEmail(
  email: string,
  data: PickupReminderData
) {
  try {
    const { data: res, error } = await resend.emails.send({
      from: `Paporla <${senderEmail}>`,
      to: email,
      subject: `Recoge tu pack hoy! ${data.packTitle}`,
      html: pickupReminderTemplate(data),
    });
    if (error) {
      console.error('[Email Error] Reminder:', error);
      return { success: false, error };
    }
    console.log('[Email Sent] Reminder to:', email);
    return { success: true, data: res };
  } catch (err) {
    console.error('[Email Exception] Reminder:', err);
    return { success: false, error: err };
  }
}

export async function sendPasswordResetEmail(email: string, resetLink: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: `Paporla <${senderEmail}>`,
      to: email,
      subject: 'Restablece tu contrasena en Paporla',
      html: passwordResetTemplate(resetLink),
    });
    if (error) {
      console.error('[Email Error] Reset:', error);
      return { success: false, error };
    }
    console.log('[Email Sent] Reset to:', email);
    return { success: true, data };
  } catch (err) {
    console.error('[Email Exception] Reset:', err);
    return { success: false, error: err };
  }
}
