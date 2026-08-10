// ============================================
// UI TYPES — Composición para vistas
// ============================================
// Los tipos base vienen de @/lib/supabase/types (canonical)
import type { Pack, Shop } from '@/lib/supabase/types'

// Re-exportar lo que otros módulos consumen
export type { Pack }

// ============================================
// PACK CON SHOP (join para listados)
// ============================================

export interface PackWithShop extends Pack {
  shop: Pick<Shop, 'id' | 'name' | 'address' | 'city' | 'phone' | 'verified' | 'rating' | 'logo_url'> & {
    latitude?: number | null
    longitude?: number | null
    description?: string | null
  }
}
