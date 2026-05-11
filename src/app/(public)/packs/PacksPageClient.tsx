'use client';

import Image from 'next/image'
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabaseBrowser } from '@/lib/supabase/client';
import PackFiltersAdvanced from '@/components/packs/PackFiltersAdvanced';
import Pagination from '@/components/ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';
import Toast from '@/components/ui/Toast';
import { Package, TrendingUp, Leaf, MapPin, Clock } from 'lucide-react';
import { formatPrice } from '@/lib/utils/formatPrice';

const ITEMS_PER_PAGE = 9;

interface Filters {
  search: string;
  minPrice: number;
  maxPrice: number;
  showAvailableOnly: boolean;
  city: string;
  location: { lat: number; lng: number } | null;
  radiusKm: number;
}

interface Pack {
  id: string;
  title: string;
  description: string;
  price_cents: number;
  original_price_cents: number | null;
  remaining_stock: number;
  total_stock: number;
  shop_name: string;
  shop_city: string;
  shop_verified: boolean;
  shop_rating: number;
  image_url: string | null;
}

// Componente de tarjeta de pack
function PackCardSimple({ pack, onReserve, index, reserving }: { pack: Pack; onReserve: (id: string) => void; index: number; reserving: string | null }) {
  const isAvailable = pack.remaining_stock > 0;
  const discount = pack.original_price_cents && pack.original_price_cents > pack.price_cents
    ? Math.round((1 - pack.price_cents / pack.original_price_cents) * 100)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      whileHover={{ y: -8 }}
      className="group relative"
    >
      <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 to-primary/10 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
      
      <div className="relative h-full rounded-2xl bg-black/40 backdrop-blur-sm border border-white/10 group-hover:border-primary/30 transition-all duration-300 overflow-hidden">
        
        <div className="absolute top-3 right-3 z-10">
          {discount && (
            <div className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-lg shadow-lg">
              -{discount}%
            </div>
          )}
        </div>

        <div className="absolute top-3 left-3 z-10">
          <div className="px-2 py-1 bg-primary/20 backdrop-blur-sm text-primary text-xs font-medium rounded-lg flex items-center gap-1">
            <Leaf className="w-3 h-3" />
            Rescatado
          </div>
        </div>

                <div className="h-44 bg-gradient-to-br from-gray-800 to-gray-900 relative overflow-hidden">
          <Image 
            src={pack.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop'} 
            alt={pack.title}
            fill
            className="object-cover transform group-hover:scale-110 transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, 400px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-white font-bold text-lg line-clamp-1 group-hover:text-primary transition-colors">
              {pack.title}
            </h3>
            <div className="text-right">
              <span className="text-primary font-bold text-xl">{formatPrice(pack.price_cents)}</span>
              {pack.original_price_cents && (
                <p className="text-xs text-gray-500 line-through">{formatPrice(pack.original_price_cents)}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
            <MapPin className="w-3 h-3" />
            <span>{pack.shop_name}</span>
            {pack.shop_verified && (
              <span className="text-primary text-xs ml-1">✓ Verificado</span>
            )}
          </div>

          <p className="text-gray-400 text-sm mb-3 line-clamp-2">
            {pack.description}
          </p>

          <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
            <div className="flex items-center gap-1">
              <Package className="w-3 h-3" />
              <span>{pack.remaining_stock} disponibles</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Recogida local</span>
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-primary" />
              <span className="text-primary">+2 comidas</span>
            </div>
          </div>

          <button
            onClick={() => onReserve(pack.id)}
            disabled={!isAvailable || reserving === pack.id}
            className={`w-full py-2.5 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
              isAvailable 
                ? 'bg-primary text-black hover:bg-primary/90 shadow-md hover:shadow-lg hover:shadow-primary/25' 
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
          >
            {reserving === pack.id ? (
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              isAvailable ? 'Reservar ahora' : 'Agotado'
            )}
          </button>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
      </div>
    </motion.div>
  );
}

export default function PacksPage() {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = supabaseBrowser();
  const [allPacks, setAllPacks] = useState<Pack[]>([]);
  const [filteredPacks, setFilteredPacks] = useState<Pack[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPacks();
  }, []);

  const loadPacks = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('available_packs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading packs:', error);
      setError(error.message);
    } else {
      setAllPacks(data || []);
      setFilteredPacks(data || []);
    }
    setLoading(false);
  };

  const handleFilterChange = (filters: Filters) => {
    let filtered = [...allPacks];

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(pack =>
        pack.title.toLowerCase().includes(searchLower) ||
        pack.description.toLowerCase().includes(searchLower)
      );
    }

    if (filters.minPrice > 0) {
      filtered = filtered.filter(pack => pack.price_cents >= filters.minPrice);
    }
    if (filters.maxPrice < 100000) {
      filtered = filtered.filter(pack => pack.price_cents <= filters.maxPrice);
    }

    if (filters.showAvailableOnly) {
      filtered = filtered.filter(pack => pack.remaining_stock > 0);
    }

    if (filters.city) {
      filtered = filtered.filter(pack => pack.shop_city === filters.city);
    }

    setFilteredPacks(filtered);
    setCurrentPage(1);
  };

  const handleReserve = async (packId: string) => {
    if (!user) {
      router.push('/login');
      return;
    }

    setReserving(packId);
    setError('');

    try {
      // Obtener el pack para saber el shop_id y precio
      const { data: pack, error: packError } = await supabase
        .from('packs')
        .select('shop_id, price_cents, title')
        .eq('id', packId)
        .maybeSingle();
      
      if (packError || !pack) throw new Error('Pack no encontrado');
      
      // Verificar si ya tiene reserva activa
      const { data: existing } = await supabase
        .from('reservations')
        .select('id')
        .eq('user_id', user.id)
        .eq('pack_id', packId)
        .in('status', ['pending', 'confirmed'])
        .maybeSingle();
      
      if (existing) {
        throw new Error('Ya tienes una reserva activa para este pack');
      }
      
      // Crear la reserva
      const { error: reservationError } = await supabase
        .from('reservations')
        .insert({
          user_id: user.id,
          shop_id: pack.shop_id,
          pack_id: packId,
          quantity: 1,
          total_price_cents: pack.price_cents,
          status: 'pending',
          payment_method: 'cash',
          payment_status: 'pending',
          reserved_at: new Date().toISOString()
        });
      
      if (reservationError) throw reservationError;
      
      // Redirigir al dashboard para ver la reserva
      router.push('/dashboard?reserved=true');
    } catch (err: any) {
      setError(err.message);
      setReserving(null);
    }
  };

  const totalPages = Math.ceil(filteredPacks.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentPacks = filteredPacks.slice(startIndex, endIndex);
  const showEmptyState = !loading && filteredPacks.length === 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <div className="container mx-auto px-4 py-12">
          <div className="animate-pulse">
            <div className="h-10 w-48 bg-gray-800 rounded mb-2 mx-auto" />
            <div className="h-4 w-96 bg-gray-800 rounded mb-8 mx-auto" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-gray-900 rounded-xl overflow-hidden">
                  <div className="h-44 bg-gray-800" />
                  <div className="p-5 space-y-3">
                    <div className="h-6 w-32 bg-gray-800 rounded" />
                    <div className="h-4 w-24 bg-gray-800 rounded" />
                    <div className="h-4 w-full bg-gray-800 rounded" />
                    <div className="h-4 w-32 bg-gray-800 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pt-20 pb-12">
        <div className="absolute top-20 left-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-secondary/10 rounded-full blur-3xl animate-pulse delay-1000" />
        
        <div className="container mx-auto px-4 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 leading-tight">
              <span className="text-gradient">Packs Disponibles</span>
            </h1>
            
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Descubre comida deliciosa a precios increíbles mientras ayudas a reducir el desperdicio alimentario.
            </p>

            <div className="mt-4 text-sm text-gray-500">
              <span className="text-primary font-semibold">{filteredPacks.length}</span> packs disponibles para rescatar
            </div>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <PackFiltersAdvanced onFilterChange={handleFilterChange} />
        
        {showEmptyState ? (
          <EmptyState 
            type="packs" 
            action={{
              label: "Limpiar filtros",
              onClick: () => handleFilterChange({
                search: '',
                minPrice: 0,
                maxPrice: 100000,
                showAvailableOnly: false,
                city: '',
                location: null,
                radiusKm: 10,
              })
            }}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentPacks.map((pack, idx) => (
                <PackCardSimple
                  key={pack.id}
                  pack={pack}
                  onReserve={handleReserve}
                  index={idx}
                  reserving={reserving}
                />
              ))}
            </div>
            
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            )}
          </>
        )}
      </div>

      {error && <Toast message={error} type="error" onClose={() => setError('')} />}
    </div>
  );
}