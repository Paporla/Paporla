'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { supabaseBrowser } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import { 
  ShoppingBag, Search, Filter, CheckCircle, XCircle, Clock, 
  Eye, Calendar, DollarSign, User, Package, Ban, Copy
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Toast from '@/components/ui/Toast';
import ConfirmModal from '@/components/ui/ConfirmModal';
import CopyButton from '@/components/ui/CopyButton';
import { formatPrice } from '@/lib/utils/formatPrice';
import { formatDate } from '@/lib/utils/formatDate';
import LoadingSkeleton from '@/components/business/LoadingSkeleton';

interface Reservation {
  id: string;
  user_id: string;
  quantity: number;
  total_price_cents: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  created_at: string;
  pickup_code: string;
  pickup_date: string | null;
  pickup_start_time: string | null;
  pickup_end_time: string | null;
  user: {
    name: string;
    email: string;
    phone: string | null;
  };
  pack: {
    id: string;
    title: string;
    price_cents: number;
  };
}

const statusConfig: Record<string, { label: string; color: string; icon: any; actions: string[] }> = {
  pending: { 
    label: 'Pendiente', 
    color: 'bg-yellow-500/20 text-yellow-400', 
    icon: Clock,
    actions: ['confirm', 'cancel']
  },
  confirmed: { 
    label: 'Confirmada', 
    color: 'bg-blue-500/20 text-blue-400', 
    icon: CheckCircle,
    actions: ['complete', 'no_show', 'cancel']
  },
  completed: { 
    label: 'Retirado', 
    color: 'bg-green-500/20 text-green-400', 
    icon: CheckCircle,
    actions: []
  },
  cancelled: { 
    label: 'Cancelada', 
    color: 'bg-red-500/20 text-red-400', 
    icon: XCircle,
    actions: []
  },
  no_show: { 
    label: 'No retirado', 
    color: 'bg-gray-500/20 text-gray-400', 
    icon: Ban,
    actions: []
  },
};

export default function BusinessReservationsPage() {
  const { user } = useAuth();
  const supabase = supabaseBrowser();
  const [shopId, setShopId] = useState<string | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [filteredReservations, setFilteredReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [reservationToCancel, setReservationToCancel] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadShopAndReservations();
    }
  }, [user]);

  useEffect(() => {
    let filtered = [...reservations];

    if (searchTerm) {
      filtered = filtered.filter(r =>
        r.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.pack.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    setFilteredReservations(filtered);
  }, [searchTerm, statusFilter, reservations]);

  const loadShopAndReservations = async () => {
    if (!user) return;
    setLoading(true);

    const { data: shopData, error: shopError } = await supabase
      .from('shops')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (shopError) {
      setError(shopError.message);
      setLoading(false);
      return;
    }

    if (!shopData) {
      setError('No se encontró tu comercio');
      setLoading(false);
      return;
    }

    setShopId(shopData.id);

    // Primera consulta: obtener reservas con pack
    const { data: reservationsData, error: reservationsError } = await supabase
      .from('reservations')
      .select(`
        id,
        user_id,
        quantity,
        total_price_cents,
        status,
        created_at,
        pickup_code,
        pickup_date,
        pickup_start_time,
        pickup_end_time,
        pack:packs (
          id,
          title,
          price_cents
        )
      `)
      .eq('shop_id', shopData.id)
      .order('created_at', { ascending: false });

    if (reservationsError) {
      setError(reservationsError.message);
      setLoading(false);
      return;
    }

    // Segunda consulta: obtener datos de usuario para cada reserva
    const reservationsWithUser = await Promise.all(
      (reservationsData || []).map(async (reservation: any) => {
        const { data: userData } = await supabase
          .from('user_profiles')
          .select('name, email, phone')
          .eq('id', reservation.user_id)
          .maybeSingle();
        
        return {
          ...reservation,
          user: userData || { name: 'Usuario', email: 'Email no disponible', phone: null }
        };
      })
    );

    setReservations(reservationsWithUser as unknown as Reservation[]);
    setFilteredReservations(reservationsWithUser as unknown as Reservation[]);
    setLoading(false);
  };

  const updateReservationStatus = async (reservationId: string, newStatus: string) => {
    setUpdating(reservationId);
    setError('');
    setSuccess('');

    const { error } = await supabase
      .from('reservations')
      .update({ status: newStatus })
      .eq('id', reservationId);

    if (error) {
      setError(error.message);
    } else {
      const statusLabels: Record<string, string> = {
        confirmed: 'confirmada',
        completed: 'completada',
        cancelled: 'cancelada'
      };
      setSuccess(`Reserva ${statusLabels[newStatus] || 'actualizada'} correctamente`);
      await loadShopAndReservations();
    }
    setUpdating(null);
  };

  const confirmCancel = (reservationId: string) => {
    setReservationToCancel(reservationId);
    setModalOpen(true);
  };

  const handleCancel = async () => {
    if (!reservationToCancel) return;
    await updateReservationStatus(reservationToCancel, 'cancelled');
    setModalOpen(false);
    setReservationToCancel(null);
  };

  const stats = {
    total: reservations.length,
    pending: reservations.filter(r => r.status === 'pending').length,
    confirmed: reservations.filter(r => r.status === 'confirmed').length,
    completed: reservations.filter(r => r.status === 'completed').length,
    cancelled: reservations.filter(r => r.status === 'cancelled').length,
    noShow: reservations.filter(r => r.status === 'no_show').length,
    totalRevenue: reservations.reduce((sum, r) => sum + (r.total_price_cents || 0), 0),
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 -mt-8 -mx-4 px-4 py-8 rounded-b-3xl">
        <div className="relative">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              Reservas
            </h1>
            <p className="text-gray-400">Gestiona todas las reservas de tus packs</p>
          </div>
        </div>
      </div>

      {/* Stats rápidos */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-primary', icon: ShoppingBag },
          { label: 'Pendientes', value: stats.pending, color: 'text-yellow-400', icon: Clock },
          { label: 'Confirmadas', value: stats.confirmed, color: 'text-blue-400', icon: CheckCircle },
          { label: 'Retiradas', value: stats.completed, color: 'text-green-400', icon: CheckCircle },
          { label: 'No retiradas', value: stats.noShow, color: 'text-gray-400', icon: Ban },
          { label: 'Canceladas', value: stats.cancelled, color: 'text-red-400', icon: XCircle },
          { label: 'Ingresos', value: `$${(stats.totalRevenue / 100).toLocaleString()}`, color: 'text-primary', icon: DollarSign },
        ].map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <Card glass className="p-3 text-center">
              <stat.icon className={`w-4 h-4 ${stat.color} mx-auto mb-1`} />
              <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            placeholder="Buscar por cliente, email o pack..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-primary focus:outline-none transition-all"
        >
          <option value="all">Todos los estados</option>
          <option value="pending">Pendientes</option>
          <option value="confirmed">Confirmadas</option>
          <option value="completed">Retiradas</option>
          <option value="no_show">No retiradas</option>
          <option value="cancelled">Canceladas</option>
        </select>
      </div>

      {filteredReservations.length === 0 ? (
        <Card glass className="text-center py-12">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <ShoppingBag className="w-10 h-10 text-primary" />
          </div>
          <p className="text-gray-400">No hay reservas</p>
          <p className="text-xs text-gray-500 mt-1">Las reservas aparecerán aquí cuando lleguen</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredReservations.map((reservation, index) => {
            const StatusIcon = statusConfig[reservation.status]?.icon || Clock;
            const status = statusConfig[reservation.status] || statusConfig.pending;
            
            return (
              <motion.div
                key={reservation.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card glass hover className="p-5 group">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="text-lg font-semibold text-white group-hover:text-primary transition-colors">
                          {reservation.pack.title}
                        </h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${status.color}`}>
                          <StatusIcon className="w-3 h-3" /> {status.label}
                        </span>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-sm text-gray-300 flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-500" />
                          {reservation.user.name} ({reservation.user.email})
                        </p>
                        {reservation.user.phone && (
                          <p className="text-xs text-gray-500 flex items-center gap-1">📞 {reservation.user.phone}</p>
                        )}
                        <p className="text-xs text-gray-500 flex items-center gap-2">
                          <Calendar className="w-3 h-3" />
                          {formatDate(reservation.created_at)}
                        </p>
                        <p className="text-sm text-primary font-semibold">
                          {reservation.quantity}x • {formatPrice(reservation.total_price_cents)}
                        </p>
                      </div>

                      {/* Código de recogida + botón copiar */}
                      {(reservation.status === 'confirmed' || reservation.status === 'pending') && (
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <div className="bg-primary/10 border border-primary/30 rounded-lg px-3 py-1.5 flex items-center gap-2">
                            <p className="text-lg font-bold text-primary tracking-wider font-mono">
                              {reservation.pickup_code}
                            </p>
                            <CopyButton text={reservation.pickup_code} label="Copiar" />
                          </div>
                          {reservation.pickup_date && reservation.pickup_end_time && (
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Recoge antes de: {new Date(reservation.pickup_date).toLocaleDateString()} {reservation.pickup_end_time?.slice(0,5)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 flex-wrap">
                      {reservation.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => updateReservationStatus(reservation.id, 'confirmed')}
                            disabled={updating === reservation.id}
                            className="flex items-center gap-1"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Confirmar
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => confirmCancel(reservation.id)}
                            disabled={updating === reservation.id}
                            className="flex items-center gap-1"
                          >
                            <XCircle className="w-4 h-4" />
                            Cancelar
                          </Button>
                        </>
                      )}
                      
                      {reservation.status === 'confirmed' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => updateReservationStatus(reservation.id, 'completed')}
                            disabled={updating === reservation.id}
                            className="flex items-center gap-1"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Retiró
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateReservationStatus(reservation.id, 'no_show')}
                            disabled={updating === reservation.id}
                            className="flex items-center gap-1 text-gray-400 hover:text-white border-gray-600"
                          >
                            <Ban className="w-4 h-4" />
                            No retiró
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => confirmCancel(reservation.id)}
                            disabled={updating === reservation.id}
                            className="flex items-center gap-1"
                          >
                            <XCircle className="w-4 h-4" />
                            Cancelar
                          </Button>
                        </>
                      )}
                      
                      <Link href={`/packs/${reservation.pack.id}`}>
                        <Button variant="outline" size="sm" className="p-2">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <ConfirmModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleCancel}
        title="Cancelar reserva"
        message="¿Estás seguro de que quieres cancelar esta reserva? Esta acción no se puede deshacer."
        confirmText="Sí, cancelar"
        cancelText="Volver"
      />

      {error && <Toast message={error} type="error" onClose={() => setError('')} />}
      {success && <Toast message={success} type="success" onClose={() => setSuccess('')} />}
    </div>
  );
}