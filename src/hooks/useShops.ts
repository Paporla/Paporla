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

export function useShops() {
  const supabase = supabaseBrowser();
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadShops = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from('shops')
      .select('*')
      .eq('verified', true)
      .eq('banned', false)
      .is('deleted_at', null)
      .order('rating', { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setShops(data || []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadShops();
  }, [loadShops]);

  return {
    shops,
    loading,
    error,
    reload: loadShops,
  };
}