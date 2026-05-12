// ============================================
// TIPOS DE RESERVAS - FLUJO SIMPLIFICADO
// Flujo: confirmed → picked_up | no_show | cancelled
// ============================================

// Incluye status antiguos (pending, ready_pickup, completed) para compatibilidad con DB
// El flujo nuevo solo usa: confirmed → picked_up | cancelled | no_show
export type ReservationStatus = 'confirmed' | 'picked_up' | 'cancelled' | 'no_show' | 'pending' | 'ready_pickup' | 'completed'
export type PaymentMethod = 'card' | 'cash' | 'demo'
export type PaymentStatus = 'pending' | 'paid' | 'completed'

export interface Reservation {
  id: string
  pack_id: string
  shop_id: string
  user_id: string
  quantity: number
  total_price_cents: number
  status: ReservationStatus
  payment_method: PaymentMethod | null
  payment_status: PaymentStatus
  payment_id: string | null
  picked_up_at: string | null
  cancelled_at: string | null
  pickup_date: string | null
  pickup_start_time: string | null
  pickup_end_time: string | null
  created_at: string
  reserved_at: string
  confirmed_at: string | null
  pickup_code: string
  pack?: {
    id: string
    title: string
    description?: string | null
    image_url?: string | null
    price_cents: number
  }
  shop?: {
    id: string
    name: string
    address: string | null
    phone: string | null
  }
}

// ============================================
// TIPO CON DETALLES COMPLETOS (para vistas)
// ============================================

export interface ReservationWithDetails extends Reservation {
  pack: {
    id: string
    title: string
    description: string | null
    price_cents: number
    image_url?: string | null
  }
  shop: {
    id: string
    name: string
    address: string | null
    phone: string | null
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
// TIPO PARA CREAR UNA RESERVA
// ============================================

export interface CreateReservationInput {
  user_id: string
  shop_id: string
  pack_id: string
  quantity?: number
  payment_method?: 'card' | 'cash' | 'demo'
}

// ============================================
// TIPO PARA ACTUALIZAR UNA RESERVA
// ============================================

export interface UpdateReservationInput {
  status?: ReservationStatus
  payment_status?: PaymentStatus
  picked_up_at?: string
  cancelled_at?: string
}