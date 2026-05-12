'use client';

import { useState, useEffect } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ShopInfo {
  id: string;
  name: string;
  verified: boolean;
  logo_url: string | null;
}

export interface PackBrief {
  id: string;
  title: string;
  remaining_stock: number;
  is_active: boolean;
  price_cents: number;
}

export interface ReservationBrief {
  id: string;
  user_id: string;
  quantity: number;
  total_price_cents: number;
  status: string;
  created_at: string;
  user: { name: string; email: string };
  pack: { title: string };
}

export interface DashboardStats {
  totalPacks: number;
  activePacks: number;
  todayReservations: number;
  totalReservations: number;
  pendingReservations: number;
  totalRevenue: number;
}

export function useBusinessDashboard() {
  const { user } = useAuth();
  const supabase = supabaseBrowser();
  const [shop, setShop] = useState<ShopInfo | null>(null);
  const [packs, setPacks] = useState<PackBrief[]>([]);
  const [recentReservations, setRecentReservations] = useState<ReservationBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalPacks: 0,
    activePacks: 0,
    todayReservations: 0,
    totalReservations: 0,
    pendingReservations: 0,
    totalRevenue: 0,
  });

  useEffect(() => {
    if (user) loadBusinessData();
  }, [user]);

  const loadBusinessData = async () => {
    if (!user) return;
    setLoading(true);

    // Obtener comercio
    const { data: shopData } = await supabase
      .from('shops')
      .select('id, name, verified, logo_url')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (!shopData) {
      setLoading(false);
      return;
    }

    setShop(shopData);

    // Obtener packs
    const { data: packsData } = await supabase
      .from('packs')
      .select('id, title, remaining_stock, is_active, price_cents')
      .eq('shop_id', shopData.id)
      .order('created_at', { ascending: false });

    const activePacks = packsData?.filter(p => p.is_active && p.remaining_stock > 0).length || 0;
    setPacks(packsData || []);

    // Obtener reservas
    const today = new Date().toISOString().split('T')[0];

    const { data: rawReservations } = await supabase
      .from('reservations')
      .select(`
        id,
        user_id,
        quantity,
        total_price_cents,
        status,
        created_at,
        pack_id,
        pack:packs(title)
      `)
      .eq('shop_id', shopData.id)
      .order('created_at', { ascending: false });

    const rawList = (rawReservations || []) as any[];
    
    // Obtener datos de usuario para cada reserva
    const enriched = await Promise.all(
      rawList.map(async (r: any) => {
        const { data: userData } = await supabase
          .from('user_profiles')
          .select('name, email')
          .eq('id', r.user_id)
          .maybeSingle();
        return {
          ...r,
          user: userData || { name: 'Usuario', email: '' },
        };
      })
    );

    const reservations = enriched as ReservationBrief[];
    
    // Calcular estadísticas
    const todayReservations = reservations.filter(r => r.created_at?.startsWith(today)).length;
    const totalReservations = reservations.length;
    const pendingReservations = reservations.filter(r => ['pending', 'confirmed'].includes(r.status)).length;
    const totalRevenue = reservations
      .filter(r => r.status === 'picked_up')
      .reduce((sum, r) => sum + (r.total_price_cents || 0), 0);

    setRecentReservations(reservations.slice(0, 5));
    setStats({
      totalPacks: packsData?.length || 0,
      activePacks,
      todayReservations,
      totalReservations,
      pendingReservations,
      totalRevenue,
    });

    setLoading(false);
  };

  return { shop, packs, recentReservations, loading, stats };
}