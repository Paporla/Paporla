'use client'

import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'
import { PackWithShop } from '@/types/pack'

export function usePacks(shopId?: string) {
  const supabase = supabaseBrowser();
  const [packs, setPacks] = useState<PackWithShop[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadPacks()
  }, [shopId])

  useEffect(() => {
    const channel = supabase
      .channel('packs-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'packs' },
        () => {
          loadPacks()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [shopId])

  const loadPacks = async () => {
    setLoading(true)
    setError(null)

    let query = supabase
      .from('packs')
      .select(`
        *,
        shop:shops (
          name,
          address,
          phone,
          verified
        )
      `)
      .eq('is_active', true)
      .gt('remaining_stock', 0)

    if (shopId) {
      query = query.eq('shop_id', shopId)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setPacks(data || [])
    }
    setLoading(false)
  }

  const getPackById = async (id: string) => {
    const { data, error } = await supabase
      .from('packs')
      .select(`
        *,
        shop:shops (
          name,
          address,
          phone,
          verified,
          description
        )
      `)
      .eq('id', id)
      .maybeSingle()

    if (error) throw error
    return data as PackWithShop
  }

  return { packs, loading, error, loadPacks, getPackById }
}
