'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { supabaseBrowser } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import { Package, Store, AlertCircle, ArrowRight, Eye } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import LoadingSkeleton from '@/components/business/LoadingSkeleton';
import BusinessHeader from '@/components/business/BusinessHeader';
import BusinessStatsCards from '@/components/business/BusinessStatsCards';
import QuickActions from '@/components/business/QuickActions';
import RecentReservations from '@/components/business/RecentReservations';

interface Shop {
  id: string;
  name: string;
  verified: boolean;
  logo_url: string | null;
}

interface Pack {
  id: string;
  title: string;
  remaining_stock: number;
  is_active: boolean;
  price_cents: number;
}

interface Reservation {
  id: string;
  user_id: string;
  quantity: number;
  total_price_cents: number;
  status: string;
  created_at: string;
  user: {
    name: string;
    email: string;
  };
  pack: {
    title: string;
  };
}

export default function BusinessDashboard() {
  const { user } = useAuth();
  const supabase = supabaseBrowser();
  const [shop, setShop] = useState<Shop | null>(null);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [recentReservations, setRecentReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPacks: 0,
    activePacks: 0,
    totalReservations: 0,
    pendingReservations: 0,
    totalRevenue: 0,
  });

    const router = useRouter();

  useEffect(() => {
    if (user) {
      loadBusinessData();
    }
  }, [user]);

  // Redirigir a completar perfil si faltan datos basicos
  useEffect(() => {
    if (shop && (!shop.name || !shop.logo_url)) {
      router.push('/business/profile');
    }
  }, [shop]);

  const loadBusinessData = async () => {
    if (!user) return;
    setLoading(true);

    const { data: shopData, error: shopError } = await supabase
      .from('shops')
      .select('id, name, verified, logo_url')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (shopError || !shopData) {
      console.error('Error loading shop:', shopError);
      setLoading(false);
      return;
    }

    setShop(shopData);

    const { data: packsData } = await supabase
      .from('packs')
      .select('id, title, remaining_stock, is_active, price_cents')
      .eq('shop_id', shopData.id)
      .order('created_at', { ascending: false });

    setPacks(packsData || []);
    
    const activePacks = packsData?.filter(p => p.is_active && p.remaining_stock > 0).length || 0;

    const { data: reservationsData } = await supabase
      .from('reservations')
      .select(`
        id,
        user_id,
        quantity,
        total_price_cents,
        status,
        created_at,
        user:user_profiles!user_id (name, email),
        pack:packs!pack_id (title)
      `)
      .eq('shop_id', shopData.id)
      .order('created_at', { ascending: false });

    const reservations = reservationsData as unknown as Reservation[] || [];
    
    const totalReservations = reservations.length;
    const pendingReservations = reservations.filter(r => r.status === 'pending').length;
    const totalRevenue = reservations.reduce((sum, r) => sum + (r.total_price_cents || 0), 0);

    setRecentReservations(reservations.slice(0, 5));

    setStats({
      totalPacks: packsData?.length || 0,
      activePacks,
      totalReservations,
      pendingReservations,
      totalRevenue,
    });

    setLoading(false);
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!shop) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-8 max-w-md border border-white/10">
          <Store className="w-16 h-16 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">¡Bienvenido a Paporla!</h2>
          <p className="text-gray-400 mb-6">
            Para comenzar a vender packs, primero debes registrar tu comercio.
          </p>
          <Link href="/business/profile">
            <Button>Completar mi perfil de comercio</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      <BusinessHeader shop={shop} />

      <BusinessStatsCards stats={stats} />

      <QuickActions />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Mis Packs */}
        <Card glass className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Mis Packs
            </h2>
            <Link href="/business/packs">
              <Button variant="outline" size="sm">Ver todos</Button>
            </Link>
          </div>
          
          {packs.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No tienes packs creados</p>
              <Link href="/business/packs/new">
                <Button size="sm" className="mt-3">Crear mi primer pack</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {packs.slice(0, 5).map((pack, idx) => (
                <motion.div
                  key={pack.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Link href={`/business/packs/${pack.id}`}>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all cursor-pointer group">
                      <div>
                        <p className="font-medium text-white group-hover:text-primary transition-colors">
                          {pack.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Stock: {pack.remaining_stock} | {pack.is_active ? 'Activo' : 'Inactivo'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-primary font-semibold text-sm">
                          ${(pack.price_cents / 100).toFixed(2)}
                        </span>
                        <Eye className="w-4 h-4 text-gray-500 group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </Card>

        <RecentReservations reservations={recentReservations} />
      </div>

      {stats.pendingReservations > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Link href="/business/reservations">
            <Card glass hover className="p-4 border-yellow-500/30 bg-yellow-500/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-500/20 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Tienes</p>
                    <p className="font-semibold text-white">{stats.pendingReservations} reserva{stats.pendingReservations !== 1 ? 's' : ''} pendiente{stats.pendingReservations !== 1 ? 's' : ''} de confirmar</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  Gestionar <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          </Link>
        </motion.div>
      )}
    </motion.div>
  );
}