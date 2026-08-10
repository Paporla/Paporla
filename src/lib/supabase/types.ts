// ============================================
// CANONICAL TYPES — Fuente única de verdad
// Derivados del esquema de base de datos
// ============================================
import type { UserRole, UserProfile } from '@/types/user'

export type { UserRole, UserProfile }

// ============================================
// SHOP
// ============================================

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
  updated_at: string | null
  country: string | null
  category: string | null
  website: string | null
  instagram: string | null
  hours: Record<string, unknown> | null
  total_packs_sold: number
  total_revenue_cents: number
  active_packs_count: number
}

// ============================================
// PACK
// ============================================

export type PackStatus = 'active' | 'sold_out' | 'expired'

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
  image_gallery: string[] | null
  is_active: boolean
  status: PackStatus
  deleted_at: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string | null
}

// ============================================
// RESERVATION
// ============================================

export type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'ready_pickup'
  | 'picked_up'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'expired'

export type PaymentMethod = 'card' | 'cash' | 'mercado_pago' | 'demo'

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'

export interface Reservation {
  id: string
  user_id: string
  shop_id: string
  pack_id: string
  quantity: number
  total_price_cents: number
  status: ReservationStatus
  pickup_code: string
  payment_id: string | null
  payment_status: PaymentStatus
  payment_method: PaymentMethod
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
}

// ============================================
// NOTIFICATION
// ============================================

export type NotificationType =
  | 'pickup_reminder'
  | 'cancellation'
  | 'confirmation'
  | 'new_pack'
  | 'shop_verified'
  | 'new_reservation'
  | 'user_cancelled'
  | 'pickup_completed'
  | 'new_user'
  | 'new_shop'
  | 'incidence'
  | 'reservation_expired'
  | 'pack_sold_out'

export interface Notification {
  id: string
  user_id: string
  reservation_id: string | null
  type: NotificationType
  message: string
  is_read: boolean
  created_at: string
  sent_at: string | null
}

// ============================================
// FAVORITE
// ============================================

export interface Favorite {
  id: string
  user_id: string
  shop_id: string
  created_at: string
}

// ============================================
// REVIEW
// ============================================

export interface Review {
  id: string
  user_id: string
  pack_id: string
  rating: number
  comment: string | null
  created_at: string
}

// ============================================
// ACTIVITY LOG
// ============================================

export type ActivitySeverity = 'info' | 'warning' | 'error' | 'critical'

export interface ActivityLog {
  id: string
  user_id: string | null
  type: string
  severity: ActivitySeverity
  title: string
  description: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}
