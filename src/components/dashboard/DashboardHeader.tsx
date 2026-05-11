'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bell } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabaseBrowser } from '@/lib/supabase/client';

interface DashboardHeaderProps {
  impactStats?: {
    totalPacks: number;
    totalSaved: number;
    co2Avoided: number;
  };
}

export default function DashboardHeader({ impactStats }: DashboardHeaderProps) {
  const { user } = useAuth();
  const supabase = supabaseBrowser();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      loadUnreadNotifications();
    }
  }, [user]);

  const loadUnreadNotifications = async () => {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user?.id)
      .eq('is_read', false)

    if (!error && count !== null) {
      setUnreadCount(count)
    }
  }

  const getLevel = (packs: number) => {
    if (packs >= 50) return { name: 'Rescatador Élite', emoji: '🏆', nextThreshold: null };
    if (packs >= 20) return { name: 'Rescatador Pro', emoji: '⭐', nextThreshold: 50 };
    if (packs >= 10) return { name: 'Rescatador Avanzado', emoji: '🌟', nextThreshold: 20 };
    if (packs >= 5) return { name: 'Rescatador', emoji: '🌱', nextThreshold: 10 };
    return { name: 'Aprendiz', emoji: '🌿', nextThreshold: 5 };
  };

  const level = getLevel(impactStats?.totalPacks || 0);
  const points = impactStats?.totalPacks || 0;
  const nextLevelPoints = level.nextThreshold || points;
  const progress = level.nextThreshold ? (points / level.nextThreshold) * 100 : 100;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gradient mb-2">
            ¡Hola, {user?.name || 'Usuario'}!
          </h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Nivel</span>
            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
              <span>{level.emoji}</span> {level.name}
            </span>
          </div>
        </div>
        
        {/* Botón de notificaciones */}
        <button className="relative">
          <Bell className="w-6 h-6 text-gray-400 hover:text-primary transition-colors" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {level.nextThreshold && (
        <div className="bg-black/40 rounded-xl p-3">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span>Progreso a {level.name === 'Rescatador' ? 'Rescatador' : level.nextThreshold === 50 ? 'Rescatador Élite' : 'Rescatador Pro'}</span>
            <span>{points}/{level.nextThreshold} pts</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      <p className="text-gray-400">
        Bienvenido a tu panel. Aquí puedes ver y gestionar tus reservas.
      </p>
    </motion.div>
  );
}