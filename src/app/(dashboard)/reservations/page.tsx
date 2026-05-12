'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabaseBrowser } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import { Calendar, CreditCard, MapPin, Inbox, AlertTriangle } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import CopyButton from '@/components/ui/CopyButton';
import Toast from '@/components/ui/Toast';
import EmptyState from '@/components/ui/EmptyState';
import PageLoader from '@/components/ui/PageLoader';
import { formatPrice } from '@/lib/utils/formatPrice';
import { formatDate } from '@/lib/utils/formatDate';
import { canCancelReservation } from '@/lib/utils/canCancelReservation';

interface Reservation {
  id: string;
  status: string;
  pickup_code: string;
  total_price_cents: number;
  quantity: number;
  created_at: string;
  pickup_date: string | null;
  pickup_end_time: string | null;
  pack: { id: string; title: string; image_url: string | null } | null;
  shop: { id: string; name: string; address: string | null } | null;
}

const statusBadges: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'bg-yellow-500/20 text-yellow-400' },
  confirmed: { label: 'Confirmada', color: 'bg-blue-500/20 text-blue-400' },
  ready_pickup: { label: 'Lista para recoger', color: 'bg-green-500/20 text-green-400' },
  picked_up: { label: 'Retirado', color: 'bg-green-500/20 text-green-400' },
  completed: { label: 'Completada', color: 'bg-green-500/20 text-green-400' },
  cancelled: { label: 'Cancelada', color: 'bg-red-500/20 text-red-400' },
  expired: { label: 'Expirada', color: 'bg-gray-500/20 text-gray-400' },
  no_show: { label: 'No retirado', color: 'bg-gray-500/20 text-gray-400' },
};

export default function UserReservationsPage() {
  const { user } = useAuth();
  const supabase = supabaseBrowser();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState<string | null>(null);

  useEffect(() => {
    if (user) loadReservations();
  }, [user]);

  const loadReservations = async () => {
    if (!user) return;
    setLoading(true);
    setError('');

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
      setReservations([]);
      setLoading(false);
      return;
    }

    const formatted = await Promise.all(
      reservationsData.map(async (reservation: any) => {
        const [packResult, shopResult] = await Promise.all([
          supabase.from('packs').select('id, title, image_url').eq('id', reservation.pack_id).maybeSingle(),
          supabase.from('shops').select('id, name, address').eq('id', reservation.shop_id).maybeSingle()
        ]);
        return { ...reservation, pack: packResult.data, shop: shopResult.data };
      })
    );

    setReservations(formatted);
    setLoading(false);
  };

  const handleCancel = async (id: string) => {
    const reservation = reservations.find(r => r.id === id);
    if (!reservation) return;

    const cancelCheck = canCancelReservation({
      status: reservation.status,
      pickup_date: reservation.pickup_date,
      pickup_start_time: reservation.pickup_end_time, // Usamos end_time como ref
    });

    if (!cancelCheck.allowed) {
      setError(cancelCheck.reason || 'No puedes cancelar esta reserva');
      return;
    }

    setCancelling(id);
    await supabase
      .from('reservations')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user?.id);
    await loadReservations();
    setCancelling(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <PageLoader />
      </div>
    );
  }

  const activeStatuses = ['pending', 'confirmed', 'ready_pickup'];
  const activeReservations = reservations.filter(r => activeStatuses.includes(r.status));
  const historyReservations = reservations.filter(r => !activeStatuses.includes(r.status));

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-24 lg:pb-6">
      <div>
        <h1 className="text-2xl font-black text-white">Mis Reservas</h1>
        <p className="text-sm text-gray-400 mt-1">Gestiona tus packs reservados</p>
      </div>

      <div className="flex gap-4">
        <div className="bg-black/40 border border-white/10 rounded-xl px-4 py-2">
          <span className="text-2xl font-bold text-primary">{activeReservations.length}</span>
          <span className="text-sm text-gray-400 ml-2">Activas</span>
        </div>
        <div className="bg-black/40 border border-white/10 rounded-xl px-4 py-2">
          <span className="text-2xl font-bold text-gray-400">{historyReservations.length}</span>
          <span className="text-sm text-gray-400 ml-2">Historial</span>
        </div>
      </div>

      {activeReservations.length === 0 ? (
        <EmptyState type="reservations" />
      ) : (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-white">Reservas Activas</h2>
          {activeReservations.map((res) => (
            <Card key={res.id} glass className="p-4">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <h3 className="font-bold text-white">{res.pack?.title || 'Pack'}</h3>
                    <span className={'text-xs px-2 py-0.5 rounded-full ' + (statusBadges[res.status]?.color || 'bg-gray-500/20 text-gray-400')}>
                      {statusBadges[res.status]?.label || res.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">{res.shop?.name || 'Comercio'}</p>
                  {res.shop?.address && (
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />{res.shop.address}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-2">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />{formatDate(res.created_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <CreditCard className="w-3 h-3" />{formatPrice(res.total_price_cents)} ({res.quantity || 1}x)
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {res.pickup_code && (
                    <div className="bg-primary/10 border border-primary/30 rounded-lg px-3 py-1.5">
                      <p className="text-[10px] text-gray-400">Codigo</p>
                      <div className="flex items-center gap-2">
                        <p className="text-lg font-bold text-primary tracking-wider font-mono">{res.pickup_code}</p>
                        <CopyButton text={res.pickup_code} label="" />
                      </div>
                    </div>
                  )}
                  {(res.status === 'pending' || res.status === 'confirmed') && (
                    <Button variant="danger" size="sm" onClick={() => handleCancel(res.id)} loading={cancelling === res.id}>
                      Cancelar
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {historyReservations.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-white">Historial</h2>
          {historyReservations.map((res) => (
            <Card key={res.id} glass className="p-4 opacity-70">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-white">{res.pack?.title || 'Pack'}</h3>
                  <p className="text-sm text-gray-400">{res.shop?.name || 'Comercio'}</p>
                  <p className="text-xs text-gray-500 mt-1">{formatPrice(res.total_price_cents)}</p>
                </div>
                <span className={'text-xs px-2 py-0.5 rounded-full ' + (statusBadges[res.status]?.color || 'bg-gray-500/20 text-gray-400')}>
                  {statusBadges[res.status]?.label || res.status}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {error && <Toast message={error} type="error" onClose={() => setError('')} />}
    </motion.div>
  );
}
