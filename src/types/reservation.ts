// ============================================
// UI TYPES — Reservas (composición para vistas)
// ============================================
// Los tipos base vienen de @/lib/supabase/types (canonical)
import type { Reservation, ReservationStatus, PaymentMethod, PaymentStatus } from '@/lib/supabase/types'

// Re-exportar para consumers existentes
export type { Reservation, ReservationStatus, PaymentMethod, PaymentStatus }

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
