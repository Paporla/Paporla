import { describe, it, expect } from 'vitest'
import {
  validatePackForm,
  getDefaultPackData,
  packToFormData,
  toChileTimestamp,
  buildPackContentParams,
  type PackFormData,
  type PackContentExtras,
} from '@/lib/utils/packForm'

const futureDate = new Date(Date.now() + 86400000).toISOString().split('T')[0]

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
  it('appends the Chile offset so the server does not guess the timezone', () => {
    expect(toChileTimestamp('2026-08-25', '18:30')).toBe('2026-08-25T18:30:00-04:00')
  })

  it('produces a timestamp the Date constructor understands', () => {
    expect(new Date(toChileTimestamp('2026-08-25', '18:30')).toISOString()).toBe('2026-08-25T22:30:00.000Z')
  })
})

describe('getDefaultPackData', () => {
  it('defaults the pickup date to tomorrow', () => {
    const data = getDefaultPackData('shop-1')
    expect(data.title).toBe('')
    expect(data.total_stock).toBe(1)
    expect(data.pickup_date).toBe(new Date(Date.now() + 86400000).toISOString().split('T')[0])
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
    expect(params.p_pickup_start_at).toBe(`${futureDate}T14:00:00-04:00`)
    expect(params.p_pickup_end_at).toBe(`${futureDate}T16:00:00-04:00`)
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
