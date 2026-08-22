import { describe, it, expect } from 'vitest'
import { translateDbError, extractErrorMessage, extractErrorCode } from '@/lib/utils/db-errors'

/**
 * El caso que motivó este módulo: los errores de Supabase son objetos planos,
 * no instancias de Error, así que `err instanceof Error` es false y el mensaje
 * real se perdía.
 */
describe('extractErrorMessage', () => {
  it('saca el mensaje de un error de PostgREST (que NO es instancia de Error)', () => {
    const supabaseError = {
      message: 'COORDINATES_MUST_COME_IN_PAIR',
      code: '22023',
      details: null,
      hint: 'Envia latitud y longitud juntas, o ninguna de las dos.',
    }
    expect(supabaseError instanceof Error).toBe(false)
    expect(extractErrorMessage(supabaseError)).toBe('COORDINATES_MUST_COME_IN_PAIR')
  })

  it('funciona con un Error de JS', () => {
    expect(extractErrorMessage(new Error('algo falló'))).toBe('algo falló')
  })

  it('funciona con un string', () => {
    expect(extractErrorMessage('texto plano')).toBe('texto plano')
  })

  it('cae a details o hint si no hay message', () => {
    expect(extractErrorMessage({ details: 'detalle' })).toBe('detalle')
    expect(extractErrorMessage({ hint: 'pista' })).toBe('pista')
  })

  it('devuelve cadena vacía con null o undefined', () => {
    expect(extractErrorMessage(null)).toBe('')
    expect(extractErrorMessage(undefined)).toBe('')
  })
})

describe('extractErrorCode', () => {
  it('devuelve el código cuando existe', () => {
    expect(extractErrorCode({ message: 'x', code: '23514' })).toBe('23514')
  })

  it('devuelve null cuando no lo hay', () => {
    expect(extractErrorCode(new Error('x'))).toBeNull()
    expect(extractErrorCode(null)).toBeNull()
  })
})

describe('translateDbError', () => {
  it('traduce el error de coordenadas desparejadas', () => {
    const err = { message: 'COORDINATES_MUST_COME_IN_PAIR', code: '22023' }
    const out = translateDbError(err)
    expect(out).toContain('latitud')
    expect(out).toContain('longitud')
    expect(out).not.toContain('COORDINATES_MUST_COME_IN_PAIR')
  })

  it('traduce el desajuste de mercado y localidad', () => {
    const err = { message: 'LOCALITY_MARKET_MISMATCH', code: '22023' }
    expect(translateDbError(err)).toContain('ciudad')
  })

  it('traduce el error de propiedad del comercio', () => {
    const err = { message: 'SHOP_NOT_OWNED_OR_INACTIVE', code: '42501' }
    expect(translateDbError(err)).toContain('no es tuyo')
  })

  it('traduce una restricción CHECK de la tabla', () => {
    const err = {
      message: 'new row for relation "shops" violates check constraint "shops_coordinates_pair_check"',
      code: '23514',
    }
    const out = translateDbError(err)
    expect(out).toContain('latitud')
    expect(out).not.toContain('violates check constraint')
  })

  it('traduce el formato de teléfono', () => {
    const err = { message: 'violates check constraint "shops_phone_e164_check"', code: '23514' }
    expect(translateDbError(err)).toContain('+56912345678')
  })

  it('usa el código SQLSTATE cuando no reconoce el mensaje', () => {
    const err = { message: 'algo raro que no mapeamos', code: '42501' }
    expect(translateDbError(err)).toBe('No tienes permiso para realizar esta acción.')
  })

  it('devuelve el mensaje original antes que uno genérico', () => {
    const err = { message: 'un error desconocido del servidor' }
    expect(translateDbError(err)).toBe('un error desconocido del servidor')
  })

  it('usa el fallback solo si no hay nada que mostrar', () => {
    expect(translateDbError(null)).toBe('No se pudo completar la operación.')
    expect(translateDbError({}, 'mi fallback')).toBe('mi fallback')
  })

  it('nunca devuelve cadena vacía', () => {
    const casos: unknown[] = [null, undefined, {}, '', new Error(''), { message: '' }]
    for (const c of casos) {
      expect(translateDbError(c).length).toBeGreaterThan(0)
    }
  })

  describe('errores de packs (0009, 0016)', () => {
    it('explica por qué no se puede eliminar un pack con reservas y sugiere pausarlo', () => {
      const msg = translateDbError({ message: 'PACK_HAS_ACTIVE_RESERVATIONS', code: 'P0001' })
      expect(msg).toContain('reservas activas')
      expect(msg).toMatch(/pausa/i)
    })

    it('traduce PACK_NOT_AUTHORIZED', () => {
      expect(translateDbError({ message: 'PACK_NOT_AUTHORIZED', code: '42501' })).toBe(
        'Este pack no pertenece a tu comercio.',
      )
    })

    it('traduce PACK_NOT_ACTIVE al intentar pausar', () => {
      expect(translateDbError({ message: 'PACK_NOT_ACTIVE', code: 'P0001' })).toBe(
        'Solo puedes pausar un pack que esté activo.',
      )
    })

    it('traduce PACK_NOT_RESUMABLE al intentar reanudar', () => {
      expect(translateDbError({ message: 'PACK_NOT_RESUMABLE', code: 'P0001' })).toMatch(/no se puede reanudar/i)
    })

    it('traduce SHOP_NOT_VERIFIED al intentar publicar', () => {
      expect(translateDbError({ message: 'SHOP_NOT_VERIFIED', code: 'P0001' })).toMatch(/no está verificado/i)
    })

    it('no confunde PACK_NOT_OWNED con PACK_NOT_PUBLISHABLE', () => {
      expect(translateDbError({ message: 'PACK_NOT_PUBLISHABLE', code: 'P0001' })).toBe(
        'Este pack no se puede publicar en su estado actual.',
      )
    })

    it('P0001 desconocido devuelve el mensaje original, nunca vacío', () => {
      const msg = translateDbError({ message: 'ALGO_NUEVO_SIN_TRADUCIR', code: 'P0001' })
      expect(msg).toBe('ALGO_NUEVO_SIN_TRADUCIR')
      expect(msg.length).toBeGreaterThan(0)
    })

    it('los errores reales de packs nunca caen en el fallback genérico', () => {
      const reales = [
        'PACK_HAS_ACTIVE_RESERVATIONS',
        'PACK_NOT_AUTHORIZED',
        'PACK_NOT_PUBLISHABLE',
        'PACK_NOT_RESUMABLE',
        'PACK_NOT_ACTIVE',
        'SHOP_NOT_VERIFIED',
      ]
      for (const message of reales) {
        const salida = translateDbError({ message, code: 'P0001' }, 'FALLBACK')
        expect(salida).not.toBe('FALLBACK')
        expect(salida).not.toBe(message)
        expect(salida).not.toBe('[object Object]')
        expect(salida.trim().length).toBeGreaterThan(0)
      }
    })
  })
})
