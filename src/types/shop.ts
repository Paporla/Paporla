import { Shop } from '@/lib/supabase/types'

export interface ShopWithOwner extends Shop {
  owner: {
    name: string | null
    email: string | null
  }
}

export type { Shop }