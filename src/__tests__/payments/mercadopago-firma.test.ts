import { describe, it, expect } from 'vitest'
import {
  construirManifiesto,
  parsearFirma,
  verificarFirmaMercadoPago,
  VENTANA_REPLAY_MS,
} from '@/lib/payments/mercadopago-firma'

// ============================================================================
// Esta función es la que decide si un desconocido puede marcar una reserva
// como pagada. Si falla en sentido permisivo, regalamos comida.
//
// Se testea por las dos caras:
//   - la firma buena se acepta
//   - CUALQUIER manipulación se rechaza
//
// Y cada test de rechazo tiene que fallar si alguien debilita la verificación.
// Es la lección del PASO 62: un test que nunca has visto en rojo no demuestra
// nada, porque puede estar pasando por razones que no tienen que ver con el
// código que pretendes proteger.
// ============================================================================

const SECRET = 'clave-de-prueba-que-no-mueve-dinero'
const AHORA = 1_742_505_638_683 // fecha fija: los tests no dependen del reloj

/** Firma exactamente como lo hace Mercado Pago, para no testear contra una idea nuestra. */
async function firmar(secret: string, dataId: string, xRequestId: string, ts: number) {
  const manifiesto = construirManifiesto(dataId, xRequestId, String(ts))
  const clave = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const firma = await crypto.subtle.sign('HMAC', clave, new TextEncoder().encode(manifiesto))
  const hex = Array.from(new Uint8Array(firma), (b) => b.toString(16).padStart(2, '0')).join('')
  return `ts=${ts},v1=${hex}`
}

async function avisoValido(
  sobrescribir: Partial<{
    xSignature: string
    xRequestId: string
    dataId: string
    secret: string
    ts: number
    ahora: number
  }> = {},
) {
  const dataId = sobrescribir.dataId ?? '123456'
  const xRequestId = sobrescribir.xRequestId ?? '439aece1-2658-4185-baa1-04da5085638e'
  const ts = sobrescribir.ts ?? AHORA
  const ahora = sobrescribir.ahora ?? AHORA
  const xSignature = sobrescribir.xSignature ?? (await firmar(sobrescribir.secret ?? SECRET, dataId, xRequestId, ts))

  return verificarFirmaMercadoPago({ xSignature, xRequestId, dataId }, SECRET, ahora)
}

describe('mercadopago-firma · construirManifiesto', () => {
  it('arma la cadena literal que firma Mercado Pago, con los punto-y-coma', () => {
    expect(construirManifiesto('123456', 'req-abc', '1742505638683')).toBe(
      'id:123456;request-id:req-abc;ts:1742505638683;',
    )
  })

  it('un espacio de más produce otra cadena — por eso no se puede "limpiar"', () => {
    expect(construirManifiesto('123456', 'req-abc', '1742505638683')).not.toBe(
      'id:123456; request-id:req-abc; ts:1742505638683;',
    )
  })
})

describe('mercadopago-firma · parsearFirma', () => {
  it('separa ts y v1', () => {
    expect(parsearFirma('ts=1742505638683,v1=abc123')).toEqual({
      ts: '1742505638683',
      v1: 'abc123',
    })
  })

  it('tolera espacios alrededor de los valores', () => {
    expect(parsearFirma('ts= 1742505638683 , v1= abc123 ')).toEqual({
      ts: '1742505638683',
      v1: 'abc123',
    })
  })

  it('devuelve null si falta v1 — una firma a medias no es una firma', () => {
    expect(parsearFirma('ts=1742505638683')).toBeNull()
  })

  it('devuelve null con basura', () => {
    expect(parsearFirma('esto-no-es-una-firma')).toBeNull()
  })
})

describe('mercadopago-firma · acepta lo bueno', () => {
  it('una firma bien hecha se acepta', async () => {
    await expect(avisoValido()).resolves.toEqual({ valida: true })
  })
})

describe('mercadopago-firma · rechaza lo manipulado', () => {
  it('si cambian el id del pago, se rechaza (el ataque que importa)', async () => {
    // Firma válida para el pago 123456...
    const xSignature = await firmar(SECRET, '123456', 'req-abc', AHORA)
    // ...pero el atacante dice que es el 999999, uno suyo sin pagar.
    await expect(
      verificarFirmaMercadoPago({ xSignature, xRequestId: 'req-abc', dataId: '999999' }, SECRET, AHORA),
    ).resolves.toEqual({ valida: false, motivo: 'NO_COINCIDE' })
  })

  it('si cambian el request-id, se rechaza', async () => {
    const xSignature = await firmar(SECRET, '123456', 'req-abc', AHORA)
    await expect(
      verificarFirmaMercadoPago({ xSignature, xRequestId: 'req-falso', dataId: '123456' }, SECRET, AHORA),
    ).resolves.toEqual({ valida: false, motivo: 'NO_COINCIDE' })
  })

  it('si firman con otra clave, se rechaza', async () => {
    const xSignature = await firmar('clave-del-atacante', '123456', 'req-abc', AHORA)
    await expect(
      verificarFirmaMercadoPago({ xSignature, xRequestId: 'req-abc', dataId: '123456' }, SECRET, AHORA),
    ).resolves.toEqual({ valida: false, motivo: 'NO_COINCIDE' })
  })

  it('si la firma no tiene forma de firma, se rechaza', async () => {
    await expect(avisoValido({ xSignature: 'no-soy-una-firma' })).resolves.toEqual({
      valida: false,
      motivo: 'FIRMA_MAL_FORMADA',
    })
  })

  it('si falta cualquier cabecera, se rechaza — y no por casualidad', async () => {
    await expect(
      verificarFirmaMercadoPago({ xSignature: null, xRequestId: 'req', dataId: '1' }, SECRET, AHORA),
    ).resolves.toEqual({ valida: false, motivo: 'FALTA_CABECERA' })

    await expect(
      verificarFirmaMercadoPago({ xSignature: 'ts=1,v1=aa', xRequestId: undefined, dataId: '1' }, SECRET, AHORA),
    ).resolves.toEqual({ valida: false, motivo: 'FALTA_CABECERA' })

    await expect(
      verificarFirmaMercadoPago({ xSignature: 'ts=1,v1=aa', xRequestId: 'req', dataId: '' }, SECRET, AHORA),
    ).resolves.toEqual({ valida: false, motivo: 'FALTA_CABECERA' })
  })
})

describe('mercadopago-firma · repelar avisos viejos', () => {
  it('un aviso de hace 10 minutos se rechaza aunque la firma sea correcta', async () => {
    const haceDiezMin = AHORA - 10 * 60 * 1000
    const xSignature = await firmar(SECRET, '123456', 'req-abc', haceDiezMin)
    await expect(
      verificarFirmaMercadoPago({ xSignature, xRequestId: 'req-abc', dataId: '123456' }, SECRET, AHORA),
    ).resolves.toEqual({ valida: false, motivo: 'FUERA_DE_PLAZO' })
  })

  it('un aviso justo dentro de la ventana se acepta', async () => {
    const casiFuera = AHORA - (VENTANA_REPLAY_MS - 1000)
    const xSignature = await firmar(SECRET, '123456', 'req-abc', casiFuera)
    await expect(
      verificarFirmaMercadoPago({ xSignature, xRequestId: 'req-abc', dataId: '123456' }, SECRET, AHORA),
    ).resolves.toEqual({ valida: true })
  })

  it('un aviso fechado en el futuro también se rechaza', async () => {
    const futuro = AHORA + 10 * 60 * 1000
    const xSignature = await firmar(SECRET, '123456', 'req-abc', futuro)
    await expect(
      verificarFirmaMercadoPago({ xSignature, xRequestId: 'req-abc', dataId: '123456' }, SECRET, AHORA),
    ).resolves.toEqual({ valida: false, motivo: 'FUERA_DE_PLAZO' })
  })

  it('un ts que no es un número se rechaza, no se cuela por Number.isFinite', async () => {
    const xSignature = 'ts=ayer,v1=abc123'
    await expect(
      verificarFirmaMercadoPago({ xSignature, xRequestId: 'req-abc', dataId: '123456' }, SECRET, AHORA),
    ).resolves.toEqual({ valida: false, motivo: 'FUERA_DE_PLAZO' })
  })
})
