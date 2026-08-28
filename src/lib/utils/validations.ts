import { z } from 'zod'
import { isValidOptionalPhone } from '@/lib/auth/profile'

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

export const registerSchema = z
  .object({
    email: z.string().trim().email('Email inválido'),
    password: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .regex(/[A-Z]/, 'Debe contener al menos una letra mayúscula')
      .regex(/[0-9]/, 'Debe contener al menos un número'),
    name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(120),
    phone: z
      .string()
      .trim()
      .refine(isValidOptionalPhone, 'Usa formato internacional, por ejemplo +56955551234')
      .optional(),
    role: z.enum(['user', 'comercio']),
    shopName: z.string().trim().min(2, 'El nombre del comercio debe tener al menos 2 caracteres').max(160).optional(),
  })
  .refine(
    (data) => {
      if (data.role === 'comercio') {
        return !!data.shopName
      }
      return true
    },
    {
      message: 'El nombre del comercio es requerido',
      path: ['shopName'],
    },
  )

export const packSchema = z.object({
  shop_id: z.string().uuid('shop_id debe ser un UUID válido'),
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres').max(200),
  description: z.string().optional(),
  price_cents: z.number().int().min(1, 'El precio debe ser mayor a 0'),
  original_price_cents: z.number().int().positive('El precio original debe ser positivo').optional(),
  total_stock: z.number().int().min(1, 'El stock debe ser mayor a 0'),
  pickup_date: z.string().min(1, 'La fecha de recogida es requerida'),
  pickup_start_time: z.string().min(1, 'La hora de inicio es requerida'),
  pickup_end_time: z.string().min(1, 'La hora de fin es requerida'),
  image_url: z.string().url().optional().or(z.literal('')),
  image_gallery: z.array(z.string()).optional(),
  is_active: z.boolean().default(true),
})

export const reservationSchema = z.object({
  quantity: z.number().min(1, 'Cantidad mínima 1'),
  payment_method: z.enum(['card', 'cash', 'mercado_pago', 'demo']),
})

export const reviewSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
})

// ============================================
// Requisitos de contraseña compartidos
// ============================================
export interface PasswordCheck {
  label: string
  passed: boolean
}

export function getPasswordChecks(password: string): PasswordCheck[] {
  return [
    { label: 'Al menos 8 caracteres', passed: password.length >= 8 },
    { label: 'Una letra mayúscula', passed: /[A-Z]/.test(password) },
    { label: 'Un número', passed: /[0-9]/.test(password) },
  ]
}

export function allPasswordChecksPassed(password: string): boolean {
  return getPasswordChecks(password).every((c) => c.passed)
}

// ============================================
// Reservations — create & update
// ============================================
export const createReservationSchema = z.object({
  pack_id: z.string({ required_error: 'pack_id es requerido' }).uuid('pack_id debe ser un UUID válido'),
  shop_id: z.string({ required_error: 'shop_id es requerido' }).uuid('shop_id debe ser un UUID válido'),
  quantity: z.number().int('Cantidad debe ser un número entero').min(1, 'Cantidad mínima 1').default(1),
  payment_method: z
    .enum(['card', 'cash', 'mercado_pago', 'demo'], {
      errorMap: () => ({ message: 'Método de pago no válido' }),
    })
    .optional(),
})

export const updateReservationSchema = z.object({
  id: z.string().uuid('ID de reserva inválido').optional(),
  status: z
    .enum(['validate_pickup', 'cancelled', 'pending', 'confirmed', 'no_show'], {
      errorMap: () => ({ message: 'Status no válido' }),
    })
    .optional(),
  cancel_reason: z.string().optional(),
  pickup_code: z.string().optional(),
})

// ============================================
// Email
// ============================================
export const sendEmailSchema = z.object({
  type: z.enum(['welcome', 'reservation', 'password_reset', 'pickup_reminder'], {
    errorMap: () => ({ message: 'Tipo de correo no válido' }),
  }),
  email: z.string({ required_error: 'Email es requerido' }).email('Formato de email inválido'),
  data: z.record(z.unknown()).optional(),
})

// ============================================
// Admin — shop ban
// ============================================
export const banShopSchema = z.object({
  banned: z.boolean({ required_error: 'El campo banned es requerido' }),
})

// ============================================
// Admin — shop verify
// ============================================
export const verifyShopSchema = z.object({
  verified: z.boolean({ required_error: 'El campo verified es requerido' }),
})

// ============================================
// Admin — user role
// ============================================
export const updateUserRoleSchema = z.object({
  role: z.enum(['user', 'comercio', 'admin', 'super_admin'], {
    errorMap: () => ({ message: 'Rol inválido' }),
  }),
})
