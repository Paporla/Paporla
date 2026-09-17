import { constantTimeEqual } from '@/lib/middleware/csrf'

// ============================================================================
// Verificación de firma de los webhooks de Mercado Pago
// ============================================================================
//
// Mercado Pago avisa de los pagos llamando a una URL nuestra. CUALQUIERA puede
// llamar a esa URL. Si nos creyéramos el cuerpo del aviso, bastaría con un POST
// diciendo "pago aprobado" para llevarse comida gratis.
//
// La firma evita eso. Mercado Pago manda:
//
//   cabecera  x-signature:  ts=1742505638683,v1=ced36ab...
//   cabecera  x-request-id: 439aece1-2658-4185-baa1-04da5085638e
//   query     ?data.id=123456&type=payment
//
// y la firma es un HMAC-SHA256 de esta cadena — el "manifiesto":
//
//   id:{data.id};request-id:{x-request-id};ts:{ts};
//
// usando como clave un secreto que se genera en el panel de Mercado Pago
// (Tus integraciones → Webhooks → Configurar notificación).
//
// DOS DETALLES QUE HAN HECHO TROPEZAR A MEDIO MUNDO:
//
// 1. El `id` del manifiesto sale de la QUERY STRING, no del cuerpo. Si lo sacas
//    del cuerpo, la firma nunca cuadra y parece que Mercado Pago está roto.
//
// 2. Hay que poner `source_news=webhooks` en la URL de notificación. Si no,
//    también te llegan avisos en formato IPN (viejo), y esos NO traen firma
//    verificable. Con ese parámetro solo te llegan webhooks de verdad.
//
// Y UNA REGLA QUE ESTA POR ENCIMA DE TODO ESTO:
//
// La firma demuestra QUIEN llama, no QUE PASO. Aunque la firma sea válida,
// el cuerpo del aviso es solo "mira, ha pasado algo con el pago 123456".
// Hay que ir a la API de Mercado Pago con ese ID y preguntar el estado real.
// Eso lo hace quien consuma esta función, no esta función.
// ============================================================================

/** Ventana de tolerancia: un aviso con más de 5 minutos se rechaza. */
export const VENTANA_REPLAY_MS = 5 * 60 * 1000

export interface CabecerasMercadoPago {
  xSignature: string | null | undefined
  xRequestId: string | null | undefined
  dataId: string | null | undefined
}

export type ResultadoFirma = { valida: true } | { valida: false; motivo: MotivoRechazo }

export type MotivoRechazo = 'FALTA_CABECERA' | 'FIRMA_MAL_FORMADA' | 'FUERA_DE_PLAZO' | 'NO_COINCIDE'

/**
 * Construye el manifiesto que Mercado Pago firma.
 *
 * El orden y los punto-y-coma no son decorativos: son la cadena literal que
 * Mercado Pago firma en su lado. Un espacio de más y no cuadra.
 */
export function construirManifiesto(dataId: string, xRequestId: string, ts: string): string {
  return `id:${dataId};request-id:${xRequestId};ts:${ts};`
}

/**
 * Parsea `ts=1742505638683,v1=ced36ab...` y devuelve las dos partes.
 *
 * Mercado Pago manda siempre las dos en ese orden. Aun así se recorre la lista
 * en vez de leer por posición: si algún día añaden un campo, no se rompe.
 */
export function parsearFirma(xSignature: string): { ts: string; v1: string } | null {
  let ts: string | null = null
  let v1: string | null = null

  for (const parte of xSignature.split(',')) {
    const separador = parte.indexOf('=')
    if (separador === -1) continue
    const clave = parte.slice(0, separador).trim()
    const valor = parte.slice(separador + 1).trim()
    if (clave === 'ts' && valor !== '') ts = valor
    else if (clave === 'v1' && valor !== '') v1 = valor
  }

  if (ts === null || v1 === null) return null
  return { ts, v1 }
}

async function hmacSha256Hex(secret: string, mensaje: string): Promise<string> {
  // Web Crypto y no node:crypto, porque esto tiene que correr igual en el
  // runtime edge y en node. Mismo criterio que csrf.ts.
  const clave = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const firma = await crypto.subtle.sign('HMAC', clave, new TextEncoder().encode(mensaje))
  return Array.from(new Uint8Array(firma), (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Comprueba que un aviso viene de verdad de Mercado Pago.
 *
 * No lanza excepciones: devuelve siempre un resultado, y cuando rechaza dice
 * por qué. El motivo va al log, que es lo que necesitas a las tres de la
 * mañana para saber si fue un ataque o un fallo de configuración.
 *
 * @param ahoraMs Momento actual. Se inyecta para poder testear la ventana de
 *                replay sin dormir al proceso ni manipular el reloj global.
 */
export async function verificarFirmaMercadoPago(
  cabeceras: CabecerasMercadoPago,
  secret: string,
  ahoraMs: number = Date.now(),
): Promise<ResultadoFirma> {
  const { xSignature, xRequestId, dataId } = cabeceras

  if (!xSignature || !xRequestId || !dataId) {
    return { valida: false, motivo: 'FALTA_CABECERA' }
  }

  const piezas = parsearFirma(xSignature)
  if (piezas === null) {
    return { valida: false, motivo: 'FIRMA_MAL_FORMADA' }
  }
  const { ts, v1 } = piezas

  // Sin esto, un aviso capturado una vez se puede reenviar para siempre.
  const marcaTiempo = Number(ts)
  if (!Number.isFinite(marcaTiempo) || Math.abs(ahoraMs - marcaTiempo) > VENTANA_REPLAY_MS) {
    return { valida: false, motivo: 'FUERA_DE_PLAZO' }
  }

  const esperado = await hmacSha256Hex(secret, construirManifiesto(dataId, xRequestId, ts))

  // Comparación en tiempo constante: comparar con === filtra información por
  // el tiempo que tarda en responder, y eso se puede medir desde fuera.
  if (!constantTimeEqual(esperado, v1.toLowerCase())) {
    return { valida: false, motivo: 'NO_COINCIDE' }
  }

  return { valida: true }
}
