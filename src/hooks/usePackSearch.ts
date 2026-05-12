'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import type { PackWithShop } from '@/types/pack';

interface SearchFilters {
  search: string;
  minPrice: number;
  maxPrice: number;
  city: string;
  showAvailableOnly: boolean;
}

export function usePackSearch(initialFilters?: Partial<SearchFilters>) {
  const supabase = supabaseBrowser();
  const [packs, setPacks] = useState<PackWithShop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SearchFilters>({
    search: '',
    minPrice: 0,
    maxPrice: 100000,
    city: '',
    showAvailableOnly: true,
    ...initialFilters,
  });

  const loadPacks = useCallback(async () => {
    setLoading(true);
    setError(null);

    const now = new Date().toISOString();

    let query = supabase
      .from('packs')
      .select(`
        *,
        shop:shops (
          id,
          name,
          address,
          city,
          phone,
          verified,
          rating,
          logo_url
        )
      `)
      .eq('is_active', true)
      .gt('remaining_stock', 0)
      .is('deleted_at', null);

    // ✅ FILTRO: No mostrar packs cuya fecha/hora de recogida ya pasó
    query = query.or(`pickup_date.is.null,pickup_end_time.is.null,and(pickup_date.not.is.null,pickup_end_time.not.is.null,concat(pickup_date,' ',pickup_end_time).gt.${now})`);

    // Filtro por búsqueda
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    // Filtro por precio
    if (filters.minPrice > 0) {
      query = query.gte('price_cents', filters.minPrice);
    }
    if (filters.maxPrice < 100000) {
      query = query.lte('price_cents', filters.maxPrice);
    }

    // Filtro por ciudad
    if (filters.city) {
      query = query.eq('shop.city', filters.city);
    }

    // Solo disponibles
    if (filters.showAvailableOnly) {
      query = query.gt('remaining_stock', 0);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setPacks(data as PackWithShop[]);
    }
    setLoading(false);
  }, [filters, supabase]);

  useEffect(() => {
    loadPacks();
  }, [loadPacks]);

  const updateFilter = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      minPrice: 0,
      maxPrice: 100000,
      city: '',
      showAvailableOnly: true,
    });
  };

  return {
    packs,
    loading,
    error,
    filters,
    updateFilter,
    resetFilters,
    reload: loadPacks,
  };
}