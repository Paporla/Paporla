// ============================================
// TIPOS DE RESERVAS
// ============================================

export interface Reservation {
  id: string
  pack_id: string
  shop_id: string
  user_id: string
  quantity: number
  total_price_cents: number
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  payment_method: 'card' | 'cash' | 'demo' | null
  payment_status: 'pending' | 'paid' | 'failed'
  payment_id: string | null
  picked_up_at: string | null
  cancelled_at: string | null
  pickup_date: string | null
  pickup_start_time: string | null
  pickup_end_time: string | null
  created_at: string
  reserved_at: string
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
  payment_method?: 'card' | 'cash'
}

// ============================================
// TIPO PARA ACTUALIZAR UNA RESERVA
// ============================================

export interface UpdateReservationInput {
  status?: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  payment_status?: 'pending' | 'paid' | 'failed'
  picked_up_at?: string
  cancelled_at?: string
}