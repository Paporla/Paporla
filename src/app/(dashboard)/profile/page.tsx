'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabaseBrowser } from '@/lib/supabase/client';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileStats from '@/components/profile/ProfileStats';
import ProfileLevel from '@/components/profile/ProfileLevel';
import ProfileMenu from '@/components/profile/ProfileMenu';
import { motion } from 'framer-motion';
import ProfileSkeleton from '@/components/profile/ProfileSkeleton';

interface UserStats {
  packsRescued: number;
  moneySaved: number;
  co2Avoided: string;
}

interface ReservationWithPack {
  total_price_cents: number;
  pack: {
    original_price_cents: number | null;
  } | null;
}

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const supabase = supabaseBrowser();
  const [stats, setStats] = useState<UserStats>({
    packsRescued: 0,
    moneySaved: 0,
    co2Avoided: '0kg',
  });
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadUserStats();
    }
  }, [user]);

  const loadUserStats = async () => {
    if (!user) return;
    setLoading(true);

    // Obtener reservas completadas
    const { data: reservations, error } = await supabase
      .from('reservations')
      .select(`
        total_price_cents,
        pack:pack_id (
          original_price_cents
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'completed');

    if (error) {
      console.error('Error loading stats:', error);
      setLoading(false);
      return;
    }

    const typedReservations = reservations as unknown as ReservationWithPack[];
    const packsRescued = typedReservations?.length || 0;
    
    // Calcular dinero ahorrado (precio original - precio pagado)
    let moneySavedCents = 0;
    for (const r of typedReservations || []) {
      const originalPrice = r.pack?.original_price_cents || r.total_price_cents;
      const saved = originalPrice - r.total_price_cents;
      if (saved > 0) {
        moneySavedCents += saved;
      }
    }

    // COâ‚‚ evitado: ~1.2kg por pack
    const co2Avoided = (packsRescued * 1.2).toFixed(1);

    // Puntos: 10 por pack completado
    const userPoints = packsRescued * 10;

    setStats({
      packsRescued,
      moneySaved: moneySavedCents / 100,
      co2Avoided: `${co2Avoided}kg`,
    });
    setPoints(userPoints);
    setLoading(false);
  };

  if (authLoading || loading) {
    return <ProfileSkeleton />;
  }

  // Determinar nivel basado en puntos
  const getLevel = (pts: number) => {
    if (pts >= 500) return { name: 'Rescatador Ã‰lite', nextLevelPoints: 1000, nextLevelName: 'Leyenda' };
    if (pts >= 200) return { name: 'Rescatador Pro', nextLevelPoints: 500, nextLevelName: 'Rescatador Ã‰lite' };
    return { name: 'Rescatador Principiante', nextLevelPoints: 200, nextLevelName: 'Rescatador Pro' };
  };

  const levelInfo = getLevel(points);
  
  // Obtener fecha de creaciÃ³n del perfil
  const memberSince = user?.created_at 
    ? new Date(user.created_at).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })
    : '2024';

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className='space-y-6 pb-24 lg:pb-6'>
      <h1 className="text-2xl font-black text-white hidden">Mi Perfil</h1>

      <ProfileHeader
        name={user?.name || null}
        email={user?.email || null}
        avatarUrl={null}
        memberSince={memberSince}
      />

      <ProfileStats
        packsRescued={stats.packsRescued}
        moneySaved={stats.moneySaved}
        co2Avoided={stats.co2Avoided}
        level={levelInfo.name}
        points={points}
      />

      <ProfileLevel
        level={levelInfo.name}
        points={points}
        nextLevelPoints={levelInfo.nextLevelPoints}
        nextLevelName={levelInfo.nextLevelName}
      />

      <ProfileMenu />
    </motion.div>
  );
}

