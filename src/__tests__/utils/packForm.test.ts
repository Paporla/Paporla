import { describe, it, expect } from 'vitest'
import {
  validatePackForm,
  calculateTimestamps,
  getDefaultPackData,
  packToFormData,
  buildPackInsertData,
} from '@/lib/utils/packForm'

describe('validatePackForm', () => {
  it('returns no errors for valid data', () => {
    const errors = validatePackForm({
      title: 'Pack Sorpresa',
      description: 'Descripcion',
      price_cents: 1500,
      original_price_cents: 3000,
      total_stock: 10,
      pickup_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      pickup_start_time: '14:00',
      pickup_end_time: '16:00',
      image_url: '',
      is_active: true,
    })
    expect(Object.keys(errors)).toHaveLength(0)
  })

  it('returns error for empty title', () => {
    const errors = validatePackForm({
      title: '',
      description: '',
      price_cents: 1500,
      original_price_cents: 0,
      total_stock: 10,
      pickup_date: '2025-06-15',
      pickup_start_time: '14:00',
      pickup_end_time: '16:00',
      image_url: '',
      is_active: true,
    })
    expect(errors.title).toBeDefined()
  })

  it('returns error for zero price', () => {
    const errors = validatePackForm({
      title: 'Pack',
      description: '',
      price_cents: 0,
      original_price_cents: 0,
      total_stock: 10,
      pickup_date: '2025-06-15',
      pickup_start_time: '14:00',
      pickup_end_time: '16:00',
      image_url: '',
      is_active: true,
    })
    expect(errors.price_cents).toBeDefined()
  })

  it('returns error for zero stock', () => {
    const errors = validatePackForm({
      title: 'Pack',
      description: '',
      price_cents: 1000,
      original_price_cents: 0,
      total_stock: 0,
      pickup_date: '2025-06-15',
      pickup_start_time: '14:00',
      pickup_end_time: '16:00',
      image_url: '',
      is_active: true,
    })
    expect(errors.total_stock).toBeDefined()
  })

  it('returns error when end time is before start time', () => {
    const errors = validatePackForm({
      title: 'Pack',
      description: '',
      price_cents: 1000,
      original_price_cents: 0,
      total_stock: 10,
      pickup_date: '2025-06-15',
      pickup_start_time: '16:00',
      pickup_end_time: '14:00',
      image_url: '',
      is_active: true,
    })
    expect(errors.pickup_end_time).toBeDefined()
  })

  it('returns error for past pickup date', () => {
    const errors = validatePackForm({
      title: 'Pack',
      description: '',
      price_cents: 1000,
      original_price_cents: 0,
      total_stock: 10,
      pickup_date: '2020-01-01',
      pickup_start_time: '14:00',
      pickup_end_time: '16:00',
      image_url: '',
      is_active: true,
    })
    expect(errors.pickup_date).toBeDefined()
  })
})

describe('calculateTimestamps', () => {
  it('returns both timestamps when all values provided', () => {
    const result = calculateTimestamps('2025-06-15', '14:00', '16:00')
    expect(result.startsAt).toMatch(/^2025-06-15T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    expect(result.startsAt).not.toBeNull()
    expect(result.endsAt).toMatch(/^2025-06-15T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    expect(result.endsAt).not.toBeNull()
  })

  it('returns null startsAt when no start time', () => {
    const result = calculateTimestamps('2025-06-15', '', '16:00')
    expect(result.startsAt).toBeNull()
    expect(result.endsAt).toMatch(/^2025-06-15T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  })

  it('returns null when no date', () => {
    const result = calculateTimestamps('', '14:00', '16:00')
    expect(result.startsAt).toBeNull()
    expect(result.endsAt).toBeNull()
  })
})

describe('getDefaultPackData', () => {
  it('returns default data for a shop', () => {
    const data = getDefaultPackData('shop-1')
    expect(data.title).toBe('')
    expect(data.price_cents).toBe(0)
    expect(data.total_stock).toBe(1)
    expect(data.is_active).toBe(true)
  })
})

describe('packToFormData', () => {
  it('converts pack to form data', () => {
    const data = packToFormData({
      title: 'Pack',
      description: 'Desc',
      price_cents: 1000,
      original_price_cents: 2000,
      total_stock: 5,
      pickup_date: '2025-06-15',
      pickup_start_time: '14:00:00',
      pickup_end_time: '16:00:00',
      image_url: 'img.jpg',
      is_active: true,
    })
    expect(data.title).toBe('Pack')
    expect(data.price_cents).toBe(1000)
    expect(data.pickup_start_time).toBe('14:00')
    expect(data.pickup_end_time).toBe('16:00')
  })
})

describe('buildPackInsertData', () => {
  it('builds insert data for new pack', () => {
    const formData = {
      title: 'Pack Nuevo',
      description: 'Descripcion',
      price_cents: 1500,
      original_price_cents: 0,
      total_stock: 10,
      pickup_date: '2025-06-15',
      pickup_start_time: '14:00',
      pickup_end_time: '16:00',
      image_url: '',
      is_active: true,
    }
    const result = buildPackInsertData('shop-1', formData, true)
    expect(result.shop_id).toBe('shop-1')
    expect(result.remaining_stock).toBe(10)
    expect(result.status).toBe('active')
  })

  it('builds update data without remaining_stock', () => {
    const formData = {
      title: 'Pack Editado',
      description: '',
      price_cents: 2000,
      original_price_cents: 0,
      total_stock: 20,
      pickup_date: '2025-06-15',
      pickup_start_time: '14:00',
      pickup_end_time: '16:00',
      image_url: '',
      is_active: true,
    }
    const result = buildPackInsertData('shop-1', formData, false)
    expect(result.shop_id).toBe('shop-1')
    expect(result.remaining_stock).toBeUndefined()
    expect(result.status).toBeUndefined()
  })
})
