'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { supabaseBrowser } from '@/lib/supabase/client';
import { 
  DashboardHeader, 
  StatsCards, 
  TipOfDay, 
  savingTips,
  ReservationFilters
} from '@/components/dashboard';
import ReservationsList from '@/components/dashboard/ReservationsList';
import { Clock, History } from 'lucide-react';
import { Reservation } from '@/types/reservation';
import Toast from '@/components/ui/Toast';
import { sortReservationsByPickupTime } from '@/components/dashboard/ReservationCard';
import DashboardImpactStats from '@/components/dashboard/DashboardImpactStats';
import DashboardEmptyState from '@/components/dashboard/DashboardEmptyState';
import DashboardSkeleton from '@/components/dashboard/DashboardSkeleton';

export default function DashboardPage() {
  const { user } = useAuth();
  const supabase = supabaseBrowser();
  const [activeReservations, setActiveReservations] = useState<Reservation[]>([]);
  const [historyReservations, setHistoryReservations] = useState<Reservation[]>([]);
  const [filteredActive, setFilteredActive] = useState<Reservation[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'confirmed'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tipOfDay] = useState(() => savingTips[Math.floor(Math.random() * savingTips.length)]);
  const [impactStats, setImpactStats] = useState({ totalPacks: 0, totalSaved: 0, co2Avoided: 0 });

  const activeRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      loadReservations();
      loadImpactStats();
    } else {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => loadReservations(), 30000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    filterActiveReservations();
  }, [activeFilter, activeReservations]);

  const filterActiveReservations = () => {
    setFilteredActive(activeFilter === 'all' ? activeReservations : activeReservations.filter(r => r.status === activeFilter));
  };

  const loadImpactStats = async () => {
    if (!user) return;
    const { data: completedReservations } = await supabase
      .from('reservations')
      .select('total_price_cents, quantity')
      .eq('user_id', user.id)
      .eq('status', 'completed');

    if (completedReservations) {
      const totalPacks = completedReservations.reduce((sum, r) => sum + (r.quantity || 1), 0);
      const totalSaved = completedReservations.reduce((sum, r) => sum + (r.total_price_cents || 0), 0);
      setImpactStats({ totalPacks, totalSaved: totalSaved / 100, co2Avoided: Math.round(totalPacks * 1.2) });
    }
  };

  const loadReservations = async () => {
    if (!user) return;
    setLoading(true);
    
    // Primero obtener las reservas
    const { data: reservationsData, error: fetchError } = await supabase
      .from('reservations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    if (!reservationsData || reservationsData.length === 0) {
      setActiveReservations([]);
      setHistoryReservations([]);
      setLoading(false);
      return;
    }

    // Para cada reserva, obtener el pack y el shop por separado
    const formatted = await Promise.all(
      reservationsData.map(async (reservation: any) => {
        const { data: packData } = await supabase
          .from('packs')
          .select('*')
          .eq('id', reservation.pack_id)
          .maybeSingle();

        const { data: shopData } = await supabase
          .from('shops')
          .select('*')
          .eq('id', reservation.shop_id)
          .maybeSingle();

        return {
          ...reservation,
          pack: packData,
          shop: shopData,
        };
      })
    );

    const active = formatted.filter(r => r.status === 'pending' || r.status === 'confirmed');
    const history = formatted.filter(r => ['completed', 'cancelled', 'no_show'].includes(r.status));

    setActiveReservations(sortReservationsByPickupTime(active));
    setHistoryReservations(history);
    setLoading(false);
  };

    const handleCancelReservation = async (reservationId: string) => {
      // Cancelar la reserva
      // El trigger update_pack_stock se encarga de restaurar el stock automaticamente
      const { error: cancelError } = await supabase
        .from('reservations')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('id', reservationId)
        .eq('user_id', user?.id);

      if (cancelError) {
        setError(cancelError.message);
        return;
      }

      // Recargar reservas
      await loadReservations();
    };

  const scrollToActive = () => activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const scrollToHistory = () => historyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const activeCount = activeReservations.length;
  const totalValue = activeReservations.reduce((sum, r) => sum + (r.total_price_cents || 0), 0);
  const filterCounts = { all: activeCount, pending: activeReservations.filter(r => r.status === 'pending').length, confirmed: activeReservations.filter(r => r.status === 'confirmed').length };

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a1a] via-[#0f0f1a] to-[#020205]">
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pt-20 pb-12">
        <div className="container mx-auto px-4 relative">
          <DashboardHeader impactStats={impactStats} />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <DashboardImpactStats totalPacks={impactStats.totalPacks} totalSaved={impactStats.totalSaved} co2Avoided={impactStats.co2Avoided} />

        <StatsCards activeCount={activeCount} totalValue={totalValue} completedCount={historyReservations.length} onScrollToActive={scrollToActive} onScrollToHistory={scrollToHistory} />

        {activeReservations.length > 0 ? (
          <div className="my-8" ref={activeRef}>
            <ReservationFilters activeFilter={activeFilter} onFilterChange={setActiveFilter} counts={filterCounts} />
            <ReservationsList reservations={filteredActive} title="Reservas Activas" icon={Clock} showCancel={true} onCancel={handleCancelReservation} />
          </div>
        ) : (
          <DashboardEmptyState />
        )}

        <div className="my-6"><TipOfDay tip={tipOfDay} /></div>

        {historyReservations.length > 0 && (
          <div className="my-8" ref={historyRef}>
            <ReservationsList reservations={historyReservations} title="Historial" icon={History} showCancel={false} />
          </div>
        )}
      </div>

      {error && <Toast message={error} type="error" onClose={() => setError('')} />}
    </div>
  );
}