'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

interface Shop {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  logo_url: string | null;
  cover_url: string | null;
  rating: number;
  verified: boolean;
  created_at: string;
}

interface Pack {
  id: string;
  title: string;
  description: string | null;
  price_cents: number;
  original_price_cents: number | null;
  remaining_stock: number;
  total_stock: number;
  is_active: boolean;
  ends_at: string | null;
  image_url: string | null;
  pickup_date: string | null;
  pickup_start_time: string | null;
  pickup_end_time: string | null;
}

export function useShop(shopId: string | undefined) {
  const supabase = supabaseBrowser();
  const [shop, setShop] = useState<Shop | null>(null);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadShop = useCallback(async () => {
    if (!shopId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);

    // Cargar comercio
    const { data: shopData, error: shopError } = await supabase
      .from('shops')
      .select('*')
      .eq('id', shopId)
      .eq('banned', false)
      .is('deleted_at', null)
      .maybeSingle();

    if (shopError || !shopData) {
      setError(shopError?.message || 'Comercio no encontrado');
      setLoading(false);
      return;
    }

    setShop(shopData);

    // Cargar packs activos del comercio
    const { data: packsData, error: packsError } = await supabase
      .from('packs')
      .select('*')
      .eq('shop_id', shopId)
      .eq('is_active', true)
      .gt('remaining_stock', 0)
      .order('created_at', { ascending: false });

    if (packsError) {
      console.error('Error loading packs:', packsError);
    } else {
      setPacks(packsData || []);
    }

    setLoading(false);
  }, [shopId, supabase]);

  useEffect(() => {
    loadShop();
  }, [loadShop]);

  return {
    shop,
    packs,
    loading,
    error,
    reload: loadShop,
  };
}