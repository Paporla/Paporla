'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import { 
  MapPin, Calendar, Clock, DollarSign, Package, 
  Store, ArrowLeft, CheckCircle, AlertCircle, 
  CreditCard, Shield, Star, Truck, ExternalLink
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Toast from '@/components/ui/Toast';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { formatPrice } from '@/lib/utils/formatPrice';
import { formatDate } from '@/lib/utils/formatDate';

interface Pack {
  id: string;
  title: string;
  description: string | null;
  price_cents: number;
  original_price_cents: number | null;
  total_stock: number;
  remaining_stock: number;
  pickup_date: string | null;
  pickup_start_time: string | null;
  pickup_end_time: string | null;
  ends_at: string | null;
  image_url: string | null;
  is_active: boolean;
  shop_id: string;
  shop: {
    id: string;
    name: string;
    description: string | null;
    address: string | null;
    city: string | null;
    phone: string | null;
    logo_url: string | null;
    rating: number;
    verified: boolean;
  };
}

export default function PackDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [pack, setPack] = useState<Pack | null>(null);
  const [pageTitle, setPageTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    if (pageTitle) {
      document.title = pageTitle + ' | Paporla';
    }
  }, [pageTitle]);

  useEffect(() => {
    loadPack();
  }, [params.id]);

  const loadPack = async () => {
    setLoading(true);
    
    const res = await fetch(`/api/packs?id=${params.id}`);
    const data = await res.json();
    
    if (!res.ok) {
      setError(data.error || 'Pack no encontrado');
      setTimeout(() => router.push('/packs'), 2000);
    } else {
      setPack(data.pack);
      setPageTitle(data.pack.title || 'Pack');
    }
    setLoading(false);
  };

  const handleReserveClick = () => {
    if (!user) {
      router.push('/login');
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmReserve = async () => {
    if (!pack) return;

    setReserving(true);
    setError('');
    setShowConfirmModal(false);

    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pack_id: pack.id,
          shop_id: pack.shop_id,
          quantity: quantity
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al reservar');
      }

      setSuccess(`âœ… Â¡Reserva exitosa! CÃ³digo: ${data.reservation.pickup_code || 'generado'}`);
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err: any) {
      setError(err.message);
      setReserving(false);
    }
  };

  const calculateDiscount = () => {
    if (!pack?.original_price_cents || pack.original_price_cents <= pack.price_cents) return null;
    return Math.round((1 - pack.price_cents / pack.original_price_cents) * 100);
  };

  const discount = calculateDiscount();
  const isAvailable = pack?.remaining_stock && pack.remaining_stock > 0 && pack.is_active;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto animate-pulse">
          <div className="h-8 w-32 bg-gray-800 rounded mb-6" />
          <div className="grid md:grid-cols-2 gap-8">
            <div className="h-96 bg-gray-800 rounded-xl" />
            <div className="space-y-4">
              <div className="h-8 w-48 bg-gray-800 rounded" />
              <div className="h-4 w-32 bg-gray-800 rounded" />
              <div className="h-6 w-24 bg-gray-800 rounded" />
              <div className="h-24 w-full bg-gray-800 rounded" />
              <div className="h-12 w-full bg-gray-800 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!pack) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <div className="glass-card rounded-2xl p-8 max-w-md mx-auto">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Pack no encontrado</h1>
          <p className="text-gray-400 mb-6">El pack que buscas no existe o ya no estÃ¡ disponible</p>
          <Button onClick={() => router.push('/packs')}>Volver a packs</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12">
      <div className="container mx-auto px-4 py-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-400 hover:text-primary transition-colors mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Volver
        </button>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Imagen */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="relative">
            <div className="relative h-80 md:h-96 rounded-2xl overflow-hidden glass-card">
              {pack.image_url ? (
                <img src={pack.image_url} alt={pack.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
                  <Package className="w-20 h-20 text-gray-500" />
                </div>
              )}
              {discount && (
                <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                  -{discount}%
                </div>
              )}
              {!isAvailable && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                  <span className="text-2xl font-bold text-white">Agotado</span>
                </div>
              )}
            </div>
          </motion.div>

          {/* InformaciÃ³n */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{pack.title}</h1>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-primary">{formatPrice(pack.price_cents)}</span>
                {pack.original_price_cents && (
                  <span className="text-lg text-gray-500 line-through">{formatPrice(pack.original_price_cents)}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Package className="w-4 h-4 text-gray-400" />
              <span className="text-gray-400">
                Stock disponible: <span className="text-primary font-semibold">{pack.remaining_stock}</span> / {pack.total_stock} unidades
              </span>
            </div>

            {pack.description && (
              <div className="p-4 glass-card rounded-xl">
                <h3 className="font-semibold text-white mb-2">DescripciÃ³n</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{pack.description}</p>
              </div>
            )}

            {(pack.pickup_date || pack.pickup_start_time) && (
              <div className="p-4 glass-card rounded-xl">
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  InformaciÃ³n de recogida
                </h3>
                <div className="space-y-2 text-sm">
                  {pack.pickup_date && (
                    <div className="flex items-center gap-2 text-gray-400">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(pack.pickup_date)}</span>
                    </div>
                  )}
                  {(pack.pickup_start_time || pack.pickup_end_time) && (
                    <div className="flex items-center gap-2 text-gray-400">
                      <Clock className="w-4 h-4" />
                      <span>{pack.pickup_start_time?.slice(0,5)} - {pack.pickup_end_time?.slice(0,5)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {isAvailable && (
              <div className="flex items-center gap-4">
                <span className="text-gray-300">Cantidad:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 text-white transition-colors"
                  >
                    -
                  </button>
                  <span className="w-12 text-center text-white font-semibold">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(pack.remaining_stock, quantity + 1))}
                    className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 text-white transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {isAvailable ? (
              <Button
                onClick={handleReserveClick}
                loading={reserving}
                className="w-full py-6 text-lg"
                icon={<CreditCard className="w-5 h-5" />}
              >
                Reservar Ahora - {formatPrice(pack.price_cents * quantity)}
              </Button>
            ) : (
              <Button disabled className="w-full py-6 text-lg" variant="outline">
                <Package className="w-5 h-5" />
                Agotado
              </Button>
            )}

            <Link href={`/shops/${pack.shop.id}`}>
              <div className="p-4 glass-card rounded-xl cursor-pointer hover:border-primary/50 transition-all group">
                <div className="flex items-center gap-3">
                  {pack.shop.logo_url ? (
                    <img src={pack.shop.logo_url} alt={pack.shop.name} className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                      <Store className="w-6 h-6 text-primary" />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white group-hover:text-primary transition-colors">
                        {pack.shop.name}
                      </p>
                      {pack.shop.verified && <CheckCircle className="w-4 h-4 text-green-400" />}
                    </div>
                    {pack.shop.address && (
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {pack.shop.address}
                        {pack.shop.city && <span className="text-gray-500">({pack.shop.city})</span>}
                      </p>
                    )}
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />
                </div>
              </div>
            </Link>

            <div className="flex items-center justify-center gap-4 text-xs text-gray-500 pt-4">
              <div className="flex items-center gap-1"><Shield className="w-3 h-3" /><span>Pago seguro</span></div>
              <div className="flex items-center gap-1"><Truck className="w-3 h-3" /><span>Recogida local</span></div>
              <div className="flex items-center gap-1"><Star className="w-3 h-3" /><span>Comercio verificado</span></div>
            </div>
          </motion.div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmReserve}
        title="Confirmar reserva"
        message={`Â¿EstÃ¡s seguro de que quieres reservar ${quantity} x "${pack.title}" por ${formatPrice(pack.price_cents * quantity)}?`}
        confirmText="SÃ­, reservar"
        cancelText="Cancelar"
      />

      {error && <Toast message={error} type="error" onClose={() => setError('')} />}
      {success && <Toast message={success} type="success" onClose={() => setSuccess('')} />}
    </div>
  );
}
