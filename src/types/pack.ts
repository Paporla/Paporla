// src/types/pack.ts

export interface Shop {
  id: string
  name: string
  address: string | null
  city: string | null
  phone: string | null
  verified: boolean
  rating: number | null
  logo_url: string | null
  latitude?: number | null
  longitude?: number | null
  user_id?: string
  description?: string | null
  cover_image?: string | null
}

export interface Pack {
  id: string
  title: string
  description: string | null
  price_cents: number
  original_price_cents: number | null
  remaining_stock: number
  total_stock: number
  shop_id: string
  pickup_date: string | null // ← AGREGAR
  pickup_start_time: string | null
  pickup_end_time: string | null
  pickup_instructions: string | null
  is_active: boolean
  deleted_at: string | null
  created_at: string
  updated_at: string
  starts_at?: string | null
  ends_at?: string | null
  image_url?: string | null
}

export interface PackWithShop extends Pack {
  shop: Shop
}

export interface Reservation {
  id: string
  user_id: string
  shop_id: string
  pack_id: string
  quantity: number
  total_price_cents: number
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  payment_method: string
  reserved_at: string
  pickup_code?: string
  cancelled_at?: string | null
  completed_at?: string | null
}
