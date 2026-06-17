import type { UserRole, UserProfile } from '@/types/user'

export type { UserRole, UserProfile }

export interface Shop {
  id: string
  owner_id: string
  name: string
  description: string | null
  address: string | null
  latitude: number | null
  longitude: number | null
  city: string | null
  logo_url: string | null
  cover_url: string | null
  phone: string | null
  rating: number
  total_ratings: number
  verified: boolean
  banned: boolean
  deleted_at: string | null
  created_at: string
}

export interface Pack {
  id: string
  shop_id: string
  title: string
  description: string | null
  price_cents: number
  original_price_cents: number | null
  discount_percentage: number | null
  total_stock: number
  remaining_stock: number
  pickup_date: string | null
  pickup_start_time: string | null
  pickup_end_time: string | null
  starts_at: string | null
  ends_at: string | null
  image_url: string | null
  is_active: boolean
  status: 'active' | 'sold_out' | 'expired'
  deleted_at: string | null
  updated_by: string | null
  created_at: string
}

export interface Reservation {
  id: string
  user_id: string
  pack_id: string
  shop_id: string
  quantity: number
  total_price_cents: number
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  pickup_code: string
  payment_id: string | null
  payment_status: 'pending' | 'paid' | 'failed'
  payment_method: 'card' | 'cash' | 'mercado_pago' | null
  reserved_at: string
  picked_up_at: string | null
  cancelled_at: string | null
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  reservation_id: string | null
  type: 'pickup_reminder' | 'cancellation' | 'confirmation'
  message: string
  is_read: boolean
  created_at: string
  sent_at: string | null
}

export interface Favorite {
  id: string
  user_id: string
  shop_id: string
  created_at: string
}

export interface Review {
  id: string
  user_id: string
  pack_id: string
  rating: number
  comment: string | null
  created_at: string
}
