'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useAuth } from './useAuth';

interface Shop {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  phone: string | null;
  verified: boolean;
  rating: number | null;
  logo_url: string | null;
  cover_url: string | null;
}

interface FavoriteShop {
  id: string;
  shop_id: string;
  shop: Shop;
}

export function useFavorites() {
  const { user } = useAuth();
  const supabase = supabaseBrowser();
  const [favorites, setFavorites] = useState<FavoriteShop[]>([]);
  const [loading, setLoading] = useState(true);
  const [favoriteShopIds, setFavoriteShopIds] = useState<Set<string>>(new Set());
  const isFirstLoad = useRef(true);

  const loadFavorites = useCallback(async () => {
    if (!user) {
      setFavorites([]);
      setFavoriteShopIds(new Set());
      setLoading(false);
      return;
    }

    // Solo mostrar loading en la primera carga
    if (isFirstLoad.current) {
      setLoading(true);
    }

    const { data, error } = await supabase
      .from('favorites')
      .select(`
        id,
        shop_id,
        shop:shops (
          id,
          name,
          address,
          city,
          phone,
          verified,
          rating,
          logo_url,
          cover_url
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading favorites:', error);
    } else {
      const typedData = data as unknown as FavoriteShop[];
      setFavorites(typedData || []);
      setFavoriteShopIds(new Set(typedData?.map(f => f.shop_id) || []));
    }
    
    setLoading(false);
    isFirstLoad.current = false;
  }, [user, supabase]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const addFavorite = async (shopId: string) => {
    if (!user) return false;

    const { error } = await supabase
      .from('favorites')
      .insert({
        user_id: user.id,
        shop_id: shopId,
      });

    if (error) {
      console.error('Error adding favorite:', error);
      return false;
    }

    await loadFavorites();
    return true;
  };

  const removeFavorite = async (shopId: string) => {
    if (!user) return false;

    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('shop_id', shopId);

    if (error) {
      console.error('Error removing favorite:', error);
      return false;
    }

    await loadFavorites();
    return true;
  };

  const toggleFavorite = async (shopId: string) => {
    if (favoriteShopIds.has(shopId)) {
      return await removeFavorite(shopId);
    } else {
      return await addFavorite(shopId);
    }
  };

  const isFavorite = (shopId: string) => favoriteShopIds.has(shopId);

  return {
    favorites,
    favoriteShopIds,
    loading,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
    reload: loadFavorites,
  };
}