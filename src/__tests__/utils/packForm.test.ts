import { describe, it, expect, vi } from 'vitest'
import {
  validatePackForm,
  getDefaultPackData,
  packToFormData,
  toChileTimestamp,
  chileDateIn,
  chileTimeNow,
  buildPackContentParams,
  type PackFormData,
  type PackContentExtras,
} from '@/lib/utils/packForm'

// Mañana en CHILE, no en UTC. Durante la franja 00:00-03:00 UTC Chile sigue en
// el día anterior, y calcular esto con `toISOString()` daba un día de más.
const futureDate = chileDateIn(1)

function makeForm(overrides: Partial<PackFormData> = {}): PackFormData {
  return {
    title: 'Pack Sorpresa',
    description: 'Descripcion',
    price_cents: 1500,
    original_price_cents: 3000,
    total_stock: 10,
    pickup_date: futureDate,
    pickup_start_time: '14:00',
    pickup_end_time: '16:00',
    image_url: '',
    is_active: true,
    ...overrides,
  }
}

describe('validatePackForm', () => {
  it('returns no errors for valid data', () => {
    expect(Object.keys(validatePackForm(makeForm()))).toHaveLength(0)
  })

  it('returns error for empty title', () => {
    expect(validatePackForm(makeForm({ title: '' })).title).toBeTruthy()
  })

  it('returns error for zero price', () => {
    expect(validatePackForm(makeForm({ price_cents: 0 })).price_cents).toBeTruthy()
  })

  it('returns error when original price is lower than sale price', () => {
    expect(validatePackForm(makeForm({ price_cents: 3000, original_price_cents: 1500 })).price_cents).toBeTruthy()
  })

  it('accepts a zero original price, meaning "no discount"', () => {
    expect(validatePackForm(makeForm({ original_price_cents: 0 })).price_cents).toBeUndefined()
  })

  it('returns error for zero stock', () => {
    expect(validatePackForm(makeForm({ total_stock: 0 })).total_stock).toBeTruthy()
  })

  it('returns error when end time is before start time', () => {
    expect(
      validatePackForm(makeForm({ pickup_start_time: '18:00', pickup_end_time: '16:00' })).pickup_end_time,
    ).toBeTruthy()
  })

  // Regresion: la recogida era "Opcional" y los packs nacian caducados.
  it('requires the pickup date', () => {
    expect(validatePackForm(makeForm({ pickup_date: '' })).pickup_date).toBeTruthy()
  })

  it('requires the pickup start time', () => {
    expect(validatePackForm(makeForm({ pickup_start_time: '' })).pickup_start_time).toBeTruthy()
  })

  it('requires the pickup end time', () => {
    expect(validatePackForm(makeForm({ pickup_end_time: '' })).pickup_end_time).toBeTruthy()
  })

  it('rejects a pickup window that already started', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    const errors = validatePackForm(makeForm({ pickup_date: yesterday }))
    expect(errors.pickup_start_time).toBeTruthy()
  })
})

describe('toChileTimestamp', () => {
  it('invierno (UTC-4): las 18:30 chilenas son 22:30 UTC', () => {
    expect(toChileTimestamp('2026-08-25', '18:30')).toBe('2026-08-25T22:30:00.000Z')
  })

  it('verano (UTC-3 desde el 2026-09-06): las 22:00 chilenas son 01:00 UTC del dia siguiente', () => {
    // El bug del dia D: con offset fijo -04:00 esto guardaba 02:00Z y el pack
    // se mostraba a las 23:00. El fundador escribio 22:00 y vio 23:00.
    expect(toChileTimestamp('2026-09-10', '22:00')).toBe('2026-09-11T01:00:00.000Z')
  })

  it('la hora guardada se lee igual en el calendario de Chile (ida y vuelta)', () => {
    const iso = toChileTimestamp('2026-09-10', '22:00')
    const leida = new Intl.DateTimeFormat('es-CL', {
      timeZone: 'America/Santiago',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(iso))
    expect(leida).toBe('22:00')
  })

  it('entrada invalida: devuelve algo que el Date constructor rechaza (NaN) para que el validador la cace', () => {
    expect(Number.isNaN(new Date(toChileTimestamp('', '')).getTime())).toBe(true)
    expect(Number.isNaN(new Date(toChileTimestamp('no-fecha', '99:99')).getTime())).toBe(true)
  })
})

describe('chileDateIn / chileTimeNow con horario real', () => {
  // 2026-09-10 03:30 UTC = 00:30 del 10-sep en Chile (verano, UTC-3).
  // Con el offset fijo de invierno (-240 min) salian las 23:30 del 09-sep:
  // la fecha "hoy" y la hora quedaban una hora atras.
  const instante = Date.UTC(2026, 8, 10, 3, 30)

  it('chileDateIn(0) devuelve el dia correcto justo despues de medianoche de verano', () => {
    expect(chileDateIn(0, instante)).toBe('2026-09-10')
  })

  it('chileDateIn(1) suma dias en el calendario chileno', () => {
    expect(chileDateIn(1, instante)).toBe('2026-09-11')
  })

  it('chileTimeNow devuelve la hora de pared chilena', () => {
    expect(chileTimeNow(instante)).toBe('00:30')
  })

  it('en invierno las mismas funciones usan UTC-4', () => {
    // 2026-06-10 03:30 UTC = 23:30 del 09-jun en Chile (invierno, UTC-4).
    const invierno = Date.UTC(2026, 5, 10, 3, 30)
    expect(chileDateIn(0, invierno)).toBe('2026-06-09')
    expect(chileTimeNow(invierno)).toBe('23:30')
  })
})

describe('getDefaultPackData', () => {
  it('defaults the pickup date to tomorrow', () => {
    const data = getDefaultPackData('shop-1')
    expect(data.title).toBe('')
    expect(data.total_stock).toBe(1)
    expect(data.pickup_date).toBe(chileDateIn(1))
  })

  /**
   * REGRESIÓN (2026-09-16): este test fallaba en el CI de lunes a domingo, pero
   * solo durante la franja 00:00-03:00 UTC. GitHub Actions corre en UTC, y en
   * ese tramo Chile (UTC-3 en verano, UTC-4 en invierno) TODAVÍA ESTÁ EN EL DÍA
   * ANTERIOR. Entonces "mañana" no era lo mismo en las dos zonas:
   *
   *   2026-09-16 01:00 UTC  ->  en Chile son las 22:00 del 2026-09-15
   *   mañana en Chile = 2026-09-16
   *   mañana en UTC   = 2026-09-17   <- lo que esperaba el test antiguo
   *
   * El código SIEMPRE hizo lo correcto (`chileDateIn(1)`): Paporla es una app
   * chilena y la fecha de retiro se calcula en hora de Chile. El equivocado era
   * el test, que calculaba en UTC.
   *
   * Se congela el reloj en esa franja para que el fallo sea determinista: así
   * este test lo cazará siempre, no solo cuando a alguien le toque esa hora.
   */
  it('la fecha por defecto es mañana en CHILE, aunque UTC ya vaya un día por delante', () => {
    vi.useFakeTimers()
    try {
      // 01:00 UTC del 16-sep-2026 = 22:00 del 15-sep-2026 en Chile (UTC-3).
      vi.setSystemTime(new Date('2026-09-16T01:00:00Z'))

      expect(chileDateIn(0)).toBe('2026-09-15') // hoy en Chile
      expect(getDefaultPackData('shop-1').pickup_date).toBe('2026-09-16')

      // Y lo que el test antiguo daba por bueno (UTC) es justo lo que NO vale.
      expect(getDefaultPackData('shop-1').pickup_date).not.toBe('2026-09-17')
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('packToFormData', () => {
  it('converts pack to form data', () => {
    const data = packToFormData({
      title: 'Pack',
      description: null,
      price_cents: 2000,
      original_price_cents: null,
      total_stock: 5,
      pickup_date: '2026-08-25',
      pickup_start_time: '14:00:00',
      pickup_end_time: '16:00:00',
      image_url: null,
      is_active: true,
    })

    expect(data.description).toBe('')
    expect(data.original_price_cents).toBe(0)
    expect(data.pickup_start_time).toBe('14:00')
    expect(data.image_url).toBe('')
  })
})

describe('buildPackContentParams', () => {
  const extras: PackContentExtras = {
    category: 'bakery',
    tags: ['pan'],
    allergen_notice: 'Contiene gluten',
    handling_notice: 'Mantener refrigerado',
    sales_start_at: '2026-08-20T10:00:00.000Z',
    image_path: 'shop-1/pack-1/foto.jpg',
    image_gallery: [],
  }

  it('maps form names to database names', () => {
    const params = buildPackContentParams(makeForm(), extras)
    expect(params.p_price_minor).toBe(1500)
    expect(params.p_original_price_minor).toBe(3000)
    // La conversion de huso la cubre el describe de toChileTimestamp; aqui se
    // verifica el MAPEO de nombres de formulario -> parametros de la RPC.
    expect(params.p_pickup_start_at).toBe(toChileTimestamp(futureDate, '14:00'))
    expect(params.p_pickup_end_at).toBe(toChileTimestamp(futureDate, '16:00'))
  })

  // Sin esto, un pack sin precio original mostraria un descuento absurdo.
  it('falls back to the sale price when there is no original price', () => {
    expect(buildPackContentParams(makeForm({ original_price_cents: 0 }), extras).p_original_price_minor).toBe(1500)
  })

  // Los campos que el formulario no muestra no pueden perderse al guardar.
  it('preserves the fields the edit form does not display', () => {
    const params = buildPackContentParams(makeForm(), extras)
    expect(params.p_category).toBe('bakery')
    expect(params.p_tags).toEqual(['pan'])
    expect(params.p_allergen_notice).toBe('Contiene gluten')
    expect(params.p_handling_notice).toBe('Mantener refrigerado')
    expect(params.p_sales_start_at).toBe('2026-08-20T10:00:00.000Z')
  })

  // Guardar la URL publica en lugar de la ruta corromperia la referencia.
  it('sends the bucket path, never a public URL', () => {
    const params = buildPackContentParams(makeForm({ image_url: 'https://cdn.example.com/foto.jpg' }), extras)
    expect(params.p_image_path).toBe('shop-1/pack-1/foto.jpg')
    expect(params.p_image_path).not.toContain('http')
  })

  it('trims title and description', () => {
    const params = buildPackContentParams(makeForm({ title: '  Pack  ', description: '  hola  ' }), extras)
    expect(params.p_title).toBe('Pack')
    expect(params.p_description).toBe('hola')
  })
})
