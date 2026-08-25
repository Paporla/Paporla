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
        'PACK_NOT_OWNED_OR_INACTIVE',
        'PACK_MUST_BE_DRAFT_OR_PAUSED',
        'INVALID_PICKUP_WINDOW',
        'STOCK_BELOW_COMMITTED_UNITS',
        'INVALID_STOCK_CHANGE',
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

  describe('edición de packs y stock (0009)', () => {
    /*
     * PACK_NOT_OWNED es prefijo de PACK_NOT_OWNED_OR_INACTIVE. Como la búsqueda
     * es por inclusión, sin ordenar por longitud el segundo recibiría el mensaje
     * del primero. Este es el test que faltaba: el módulo lo daba por hecho en
     * un comentario, pero nadie lo comprobaba.
     */
    it('distingue PACK_NOT_OWNED_OR_INACTIVE de PACK_NOT_OWNED', () => {
      const largo = translateDbError({ message: 'PACK_NOT_OWNED_OR_INACTIVE', code: '42501' })
      const corto = translateDbError({ message: 'PACK_NOT_OWNED', code: '42501' })
      expect(largo).not.toBe(corto)
      expect(largo).toMatch(/no está disponible para editar/i)
      expect(corto).toBe('Este pack no pertenece a tu comercio.')
    })

    it('pide pausar el pack antes de editarlo', () => {
      expect(translateDbError({ message: 'PACK_MUST_BE_DRAFT_OR_PAUSED', code: 'P0001' })).toMatch(/pausa/i)
    })

    it('explica la ventana de recogida invertida', () => {
      expect(translateDbError({ message: 'INVALID_PICKUP_WINDOW', code: '22023' })).toMatch(/posterior a la de inicio/i)
    })

    it('explica que no se puede bajar el stock por debajo de lo reservado', () => {
      const salida = translateDbError({ message: 'STOCK_BELOW_COMMITTED_UNITS', code: 'P0001' })
      expect(salida).toMatch(/reservado/i)
      // El RAISE no envía la cifra, así que el texto no debe fingir conocerla.
      expect(salida).not.toMatch(/\d+ unidades/)
    })

    it('traduce una cantidad de stock inválida', () => {
      expect(translateDbError({ message: 'INVALID_STOCK_CHANGE', code: '22023' })).toMatch(/no válida/i)
    })

    it('el 22023 con mensaje conocido no cae en el texto genérico de SQLSTATE', () => {
      // Antes, INVALID_PICKUP_WINDOW salía como 'Dato no válido. INVALID_PICKUP_WINDOW'.
      const salida = translateDbError({ message: 'INVALID_PICKUP_WINDOW', code: '22023' })
      expect(salida).not.toMatch(/Dato no válido/)
      expect(salida).not.toMatch(/INVALID_PICKUP_WINDOW/)
    })

    /*
     * Red de seguridad para el futuro: si alguien añade una clave que sea
     * subcadena de otra, el orden por longitud lo resuelve. Este test comprueba
     * que TODAS las claves se traducen a su propio mensaje, colisionen o no.
     */
    it('cada clave se traduce a su propio mensaje, aunque unas contengan a otras', () => {
      const claves = Object.keys(MENSAJES_ESPERADOS)
      for (const clave of claves) {
        expect(translateDbError({ message: clave, code: 'P0001' })).toBe(MENSAJES_ESPERADOS[clave])
      }
    })
  })

  describe('errores de cancelación (cancel_reservation, 0009:366)', () => {
    it('pide el motivo cuando falta o es muy corto', () => {
      const salida = translateDbError({ message: 'CANCELLATION_REASON_REQUIRED', code: '22023' })
      expect(salida).toBe('Para cancelar, indícanos un motivo (al menos 3 letras).')
    })

    it('traduce la reserva inexistente', () => {
      expect(translateDbError({ message: 'RESERVATION_NOT_FOUND', code: 'P0002' })).toBe(
        'La reserva no existe o ya no está disponible.',
      )
    })

    it('traduce el estado no cancelable', () => {
      expect(translateDbError({ message: 'RESERVATION_NOT_CANCELLABLE', code: 'P0001' })).toBe(
        'Esta reserva ya no puede cancelarse.',
      )
    })

    it('traduce el falta de permiso', () => {
      expect(translateDbError({ message: 'NOT_AUTHORIZED_FOR_RESERVATION', code: '42501' })).toBe(
        'No tienes permiso para gestionar esta reserva.',
      )
    })

    it('traduce el plazo agotado', () => {
      expect(translateDbError({ message: 'CANCELLATION_WINDOW_CLOSED', code: 'P0001' })).toBe(
        'Pasó el plazo para cancelar esta reserva.',
      )
    })

    it('traduce el cursor inválido de la lista', () => {
      expect(translateDbError({ message: 'INVALID_RESERVATION_PAGE_ARGUMENTS', code: '22023' })).toBe(
        'No se pudo cargar la página de reservas. Vuelve a intentarlo.',
      )
    })

    /*
     * RESERVATION_NOT_FOUND y RESERVATION_NOT_CANCELLABLE comparten el prefijo
     * 'RESERVATION_NOT_'. Sin el orden de más larga a más corta, uno se
     * tragaría al otro según el orden del objeto. Este test frena ese futuro.
     */
    it('no confunde RESERVATION_NOT_FOUND con RESERVATION_NOT_CANCELLABLE', () => {
      const noEncontrada = translateDbError({ message: 'RESERVATION_NOT_FOUND', code: 'P0002' })
      const noCancelable = translateDbError({ message: 'RESERVATION_NOT_CANCELLABLE', code: 'P0001' })
      expect(noEncontrada).not.toBe(noCancelable)
      expect(noEncontrada).toContain('no existe')
      expect(noCancelable).toContain('ya no puede cancelarse')
    })
  })
})

/*
 * Pares clave -> mensaje exacto de los códigos que más se cruzan entre sí.
 * Se declara fuera del describe para que el test anterior quede legible.
 */
const MENSAJES_ESPERADOS: Record<string, string> = {
  PACK_NOT_OWNED: 'Este pack no pertenece a tu comercio.',
  PACK_NOT_OWNED_OR_INACTIVE: 'Este pack ya no está disponible para editar. Comprueba que tu comercio siga activo.',
  PACK_NOT_FOUND: 'No se encontró el pack.',
  PACK_NOT_ACTIVE: 'Solo puedes pausar un pack que esté activo.',
  CANCELLATION_REASON_REQUIRED: 'Para cancelar, indícanos un motivo (al menos 3 letras).',
  RESERVATION_NOT_FOUND: 'La reserva no existe o ya no está disponible.',
  RESERVATION_NOT_CANCELLABLE: 'Esta reserva ya no puede cancelarse.',
  NOT_AUTHORIZED_FOR_RESERVATION: 'No tienes permiso para gestionar esta reserva.',
  CANCELLATION_WINDOW_CLOSED: 'Pasó el plazo para cancelar esta reserva.',
  INVALID_RESERVATION_PAGE_ARGUMENTS: 'No se pudo cargar la página de reservas. Vuelve a intentarlo.',
}
