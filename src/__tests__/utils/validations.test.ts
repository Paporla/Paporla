import { describe, it, expect } from 'vitest'
import { loginSchema, registerSchema, packSchema, reservationSchema, reviewSchema } from '@/lib/utils/validations'

describe('loginSchema', () => {
  it('validates correct login data', () => {
    const result = loginSchema.safeParse({
      email: 'test@example.com',
      password: 'Password123',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({
      email: 'invalid-email',
      password: 'Password123',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty password', () => {
    const result = loginSchema.safeParse({
      email: 'test@example.com',
      password: '',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing fields', () => {
    const result = loginSchema.safeParse({ email: 'test@example.com' })
    expect(result.success).toBe(false)
  })
})

describe('registerSchema', () => {
  it('validates correct user registration', () => {
    const result = registerSchema.safeParse({
      email: 'test@example.com',
      password: 'Password123',
      name: 'Test User',
      role: 'user',
    })
    expect(result.success).toBe(true)
  })

  it('validates correct commerce registration with shop name', () => {
    const result = registerSchema.safeParse({
      email: 'shop@example.com',
      password: 'Password123',
      name: 'Shop Owner',
      role: 'comercio',
      shopName: 'Mi Tienda',
    })
    expect(result.success).toBe(true)
  })

  it('rejects commerce without shop name', () => {
    const result = registerSchema.safeParse({
      email: 'shop@example.com',
      password: 'Password123',
      name: 'Shop Owner',
      role: 'comercio',
    })
    expect(result.success).toBe(false)
  })

  it('rejects password without uppercase', () => {
    const result = registerSchema.safeParse({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
      role: 'user',
    })
    expect(result.success).toBe(false)
  })

  it('rejects password without number', () => {
    const result = registerSchema.safeParse({
      email: 'test@example.com',
      password: 'Password',
      name: 'Test User',
      role: 'user',
    })
    expect(result.success).toBe(false)
  })

  it('rejects short name', () => {
    const result = registerSchema.safeParse({
      email: 'test@example.com',
      password: 'Password123',
      name: 'A',
      role: 'user',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid role', () => {
    const result = registerSchema.safeParse({
      email: 'test@example.com',
      password: 'Password123',
      name: 'Test User',
      role: 'admin',
    })
    expect(result.success).toBe(false)
  })

  it('allows optional phone', () => {
    const result = registerSchema.safeParse({
      email: 'test@example.com',
      password: 'Password123',
      name: 'Test User',
      role: 'user',
      phone: '+56 9 12345678',
    })
    expect(result.success).toBe(true)
  })
})

describe('packSchema', () => {
  const validPack = {
    shop_id: '00000000-0000-0000-0000-000000000001',
    title: 'Pack Sorpresa',
    price_cents: 1500,
    total_stock: 10,
    pickup_date: '2024-06-15',
    pickup_start_time: '14:00',
    pickup_end_time: '16:00',
  }

  it('validates correct pack data', () => {
    const result = packSchema.safeParse({
      ...validPack,
      description: 'Delicioso pack',
      original_price_cents: 3000,
    })
    expect(result.success).toBe(true)
  })

  it('defaults is_active to true', () => {
    const result = packSchema.safeParse(validPack)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.is_active).toBe(true)
    }
  })

  it('rejects short title', () => {
    const result = packSchema.safeParse({ ...validPack, title: 'Pa' })
    expect(result.success).toBe(false)
  })

  it('rejects zero price', () => {
    const result = packSchema.safeParse({ ...validPack, price_cents: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects zero stock', () => {
    const result = packSchema.safeParse({ ...validPack, total_stock: 0 })
    expect(result.success).toBe(false)
  })

  it('allows image_gallery array', () => {
    const result = packSchema.safeParse({ ...validPack, image_gallery: ['url1', 'url2'] })
    expect(result.success).toBe(true)
  })
})

describe('reservationSchema', () => {
  it('validates correct reservation', () => {
    const result = reservationSchema.safeParse({
      quantity: 2,
      payment_method: 'demo',
    })
    expect(result.success).toBe(true)
  })

  it('rejects zero quantity', () => {
    const result = reservationSchema.safeParse({
      quantity: 0,
      payment_method: 'demo',
    })
    expect(result.success).toBe(false)
  })

  it('accepts all valid payment methods', () => {
    const methods = ['card', 'cash', 'mercado_pago', 'demo'] as const
    for (const method of methods) {
      const result = reservationSchema.safeParse({
        quantity: 1,
        payment_method: method,
      })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid payment method', () => {
    const result = reservationSchema.safeParse({
      quantity: 1,
      payment_method: 'bitcoin',
    })
    expect(result.success).toBe(false)
  })
})

describe('reviewSchema', () => {
  it('validates correct review', () => {
    const result = reviewSchema.safeParse({
      rating: 4,
      comment: 'Great pack!',
    })
    expect(result.success).toBe(true)
  })

  it('validates review without comment', () => {
    const result = reviewSchema.safeParse({ rating: 5 })
    expect(result.success).toBe(true)
  })

  it('rejects rating below 1', () => {
    const result = reviewSchema.safeParse({ rating: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects rating above 5', () => {
    const result = reviewSchema.safeParse({ rating: 6 })
    expect(result.success).toBe(false)
  })
})
