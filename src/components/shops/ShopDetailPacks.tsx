'use client';

import { motion } from 'framer-motion';
import { Package, Clock, MapPin, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { formatPrice } from '@/lib/utils/formatPrice';

interface Pack {
  id: string;
  title: string;
  description: string | null;
  price_cents: number;
  original_price_cents: number | null;
  remaining_stock: number;
  total_stock: number;
  is_active: boolean;
  ends_at: string | null;
  pickup_date: string | null;
  pickup_start_time: string | null;
  pickup_end_time: string | null;
  image_url: string | null;
}

interface ShopDetailPacksProps {
  packs: Pack[];
  shopName: string;
  shopAddress: string | null;
}

export default function ShopDetailPacks({ packs, shopName, shopAddress }: ShopDetailPacksProps) {
  if (packs.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="dark:bg-black/40 bg-white backdrop-blur-sm dark:border-white/10 border-gray-200 rounded-2xl p-10 text-center"
      >
        <div className="w-16 h-16 mx-auto mb-4 rounded-full dark:bg-white/5 bg-gray-100 flex items-center justify-center">
          <Package className="w-8 h-8 dark:text-gray-600 text-gray-400" />
        </div>
        <p className="dark:text-gray-400 text-gray-600 font-medium">No hay packs disponibles</p>
        <p className="text-xs dark:text-gray-500 text-gray-400 mt-1">Vuelve mas tarde para ver nuevas opciones</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold dark:text-white text-gray-900 flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          Packs disponibles
        </h2>
        <span className="text-xs dark:text-gray-500 text-gray-400 dark:bg-white/5 bg-gray-100 dark:border-white/10 border-gray-200 px-3 py-1 rounded-full">
          {packs.length} pack{packs.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {packs.map((pack, idx) => {
          const discount = pack.original_price_cents
            ? Math.round((1 - pack.price_cents / pack.original_price_cents) * 100)
            : null;

          const pickupTime = pack.pickup_start_time && pack.pickup_end_time
            ? pack.pickup_start_time.slice(0, 5) + ' - ' + pack.pickup_end_time.slice(0, 5)
            : null;

          const isLowStock = pack.remaining_stock <= 3;
          const hasImage = pack.image_url && pack.image_url.trim() !== '';

          return (
            <motion.div
              key={pack.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
            >
              <Link href={'/packs/' + pack.id}>
                <div className="group dark:bg-black/40 bg-white backdrop-blur-sm dark:border-white/10 border-gray-200 hover:border-primary/30 rounded-2xl overflow-hidden transition-all duration-300 h-full">
                  {/* Imagen */}
                  <div className="relative h-36 md:h-44 overflow-hidden dark:bg-[#0a0a1a] bg-gray-100">
                    {hasImage ? (
                      <Image
                        src={pack.image_url!}
                        alt={pack.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-12 h-12 dark:text-gray-700 text-gray-400" />
                      </div>
                    )}
                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                    {/* Badges sobre la imagen */}
                    <div className="absolute top-3 left-3 flex gap-2">
                      {discount && (
                        <span className="text-xs font-bold bg-primary text-black px-2.5 py-1 rounded-full">
                          -{discount}%
                        </span>
                      )}
                      {isLowStock && (
                        <span className="text-xs font-medium bg-red-500/90 text-white px-2.5 py-1 rounded-full animate-pulse">
                          Quedan {pack.remaining_stock}!
                        </span>
                      )}
                    </div>

                    {/* Precio sobre imagen */}
                    <div className="absolute bottom-3 right-3">
                      <div className="flex items-baseline gap-1 bg-black/70 backdrop-blur-sm rounded-xl px-3 py-1.5">
                        <span className="text-lg font-bold text-primary">{formatPrice(pack.price_cents)}</span>
                        {pack.original_price_cents && (
                          <span className="text-xs dark:text-gray-500 text-gray-400 line-through">{formatPrice(pack.original_price_cents)}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4 space-y-2">
                    <h3 className="font-semibold dark:text-white text-gray-900 group-hover:text-primary transition-colors line-clamp-1">
                      {pack.title}
                    </h3>

                    {pack.description && (
                      <p className="text-sm dark:text-gray-500 text-gray-400 line-clamp-2 leading-relaxed">{pack.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-xs dark:text-gray-500 text-gray-400 pt-1">
                      <span className="flex items-center gap-1">
                        <Package className="w-3 h-3 text-primary" />
                        Stock: {pack.remaining_stock}/{pack.total_stock}
                      </span>
                      {pickupTime && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-primary" />
                          {pickupTime}
                        </span>
                      )}
                      {shopAddress && (
                        <span className="flex items-center gap-1 truncate max-w-[160px]">
                          <MapPin className="w-3 h-3 text-primary flex-shrink-0" />
                          {shopAddress}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-all pt-1">
                      <span>Ver detalle</span>
                      <ChevronRight className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
