// ============================================
// TIPOS DE RESERVAS - TOO GOOD TO GO CLONE
// ============================================

// Estados de reserva (coinciden con la DB)
export type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'ready_pickup'
  | 'picked_up'
  | 'cancelled'
  | 'expired'
  | 'no_show'

// Métodos de pago
export type PaymentMethod = 'card' | 'cash' | 'demo' | 'stripe'

// Estados de pago
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'

// ============================================
// INTERFAZ PRINCIPAL DE RESERVA
// ============================================

export interface Reservation {
  id: string
  user_id: string
  shop_id: string
  pack_id: string
  quantity: number
  total_price_cents: number
  status: ReservationStatus
  pickup_code: string
  payment_method: PaymentMethod | null
  payment_status: PaymentStatus
  payment_id: string | null
  pickup_date: string | null
  pickup_start_time: string | null
  pickup_end_time: string | null
  reserved_at: string
  picked_up_at: string | null
  cancelled_at: string | null
  cancelled_by: string | null
  cancel_reason: string | null
  created_at: string
  updated_at: string
  // Datos anidados (se llenan con joins)
  pack?: {
    id: string
    title: string
    description: string | null
    image_url: string | null
    price_cents: number
  }
  shop?: {
    id: string
    name: string
    address: string | null
    phone: string | null
    latitude: number | null
    longitude: number | null
    city: string | null
  }
  user?: {
    id: string
    name: string | null
    email: string | null
    phone: string | null
  }
}

// ============================================
// RESERVA CON DETALLES COMPLETOS (para vistas)
// ============================================

export interface ReservationWithDetails extends Reservation {
  pack: {
    id: string
    title: string
    description: string | null
    price_cents: number
    image_url: string | null
  }
  shop: {
    id: string
    name: string
    address: string | null
    phone: string | null
    latitude: number | null
    longitude: number | null
    city: string | null
    verified?: boolean
  }
  user?: {
    id: string
    name: string | null
    email: string | null
    phone: string | null
  }
}

// ============================================
// RESULTADO DE CREAR RESERVA (RPC)
// ============================================

export interface CreateReservationResult {
  success: boolean
  reservation_id?: string
  pickup_code?: string
  total_price?: number
  status?: string
  error?: string
}

// ============================================
// RESULTADO DE CANCELAR/VALIDAR (RPC)
// ============================================

export interface ReservationActionResult {
  success: boolean
  message?: string
  error?: string
}

// ============================================
// INPUT PARA CREAR RESERVA (desde frontend)
// ============================================

export interface CreateReservationInput {
  packId: string
  shopId: string
  quantity?: number
  paymentMethod?: PaymentMethod
}

// ============================================
// INPUT PARA ACTUALIZAR RESERVA
// ============================================

export interface UpdateReservationInput {
  status?: ReservationStatus
  payment_status?: PaymentStatus
  picked_up_at?: string
  cancelled_at?: string
  cancel_reason?: string
}
