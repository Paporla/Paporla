import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

export const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  phone: z.string().optional(),
    role: z.enum(['user', 'comercio']),
  shopName: z.string().optional(),
}).refine((data) => {
  if (data.role === 'comercio') {
    return !!data.shopName
  }
  return true
}, {
  message: 'El nombre del comercio es requerido',
  path: ['shopName'],
})

export const packSchema = z.object({
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres'),
  description: z.string().optional(),
  price_cents: z.number().min(1, 'El precio debe ser mayor a 0'),
  original_price_cents: z.number().optional(),
  total_stock: z.number().min(1, 'El stock debe ser mayor a 0'),
  pickup_date: z.string().nullable(),
  pickup_start_time: z.string().nullable(),
  pickup_end_time: z.string().nullable(),
  starts_at: z.string().nullable(),
  ends_at: z.string().nullable(),
  image_url: z.string().optional(),
  is_active: z.boolean(),
})

export const reservationSchema = z.object({
  quantity: z.number().min(1, 'Cantidad mínima 1'),
  payment_method: z.enum(['card', 'cash', 'mercado_pago']),
})

export const reviewSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
})