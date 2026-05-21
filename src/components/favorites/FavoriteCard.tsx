'use client';

import { motion } from 'framer-motion';
import { MapPin, Star, Trash2, Store } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface Shop {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  phone: string | null;
  verified: boolean;
  rating: number | null;
  logo_url: string | null;
  cover_url: string | null;
}

interface FavoriteCardProps {
  id: string;
  shop: Shop;
  onRemove: () => void;
}

export default function FavoriteCard({ id, shop, onRemove }: FavoriteCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="dark:bg-dark-card bg-white dark:border-dark-border border-gray-200 rounded-2xl overflow-hidden hover:border-primary/30 transition-all cursor-pointer group"
    >
      <Link href={`/shops/${shop.id}`}>
        <div className="flex flex-col sm:flex-row">
          {/* Imagen / Logo */}
          <div className="relative w-full sm:w-32 h-32 dark:bg-dark-muted bg-gray-100 flex items-center justify-center">
            {shop.logo_url ? (
              <Image 
                src={shop.logo_url} 
                alt={shop.name} 
                width={128} 
                height={128}
                className="w-full h-full object-cover"
              />
            ) : (
              <Store className="w-12 h-12 dark:text-gray-500 text-gray-400" />
            )}
            
            {shop.verified && (
              <div className="absolute top-2 left-2 bg-primary/90 text-dark text-[10px] font-black px-2 py-0.5 rounded-lg">
                Verificado
              </div>
            )}
          </div>
          
          {/* Contenido */}
          <div className="flex-1 p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-xs dark:text-white text-gray-900">{shop.rating?.toFixed(1) || 'Nuevo'}</span>
                  </div>
                </div>
                <h3 className="font-bold dark:text-white text-gray-900 group-hover:text-primary transition-colors">
                  {shop.name}
                </h3>
                {shop.address && (
                  <p className="text-sm dark:text-gray-400 text-gray-600 flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" />
                    {shop.address.split(',')[0]}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t dark:border-dark-border border-gray-200">
              <div className="flex items-center gap-3 text-xs dark:text-gray-500 text-gray-400">
                {shop.city && (
                  <span>{shop.city}</span>
                )}
                {shop.phone && (
                  <span>{shop.phone}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </Link>
      
      {/* Boton eliminar */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="absolute top-4 right-4 p-2 rounded-full bg-red-500/10 hover:bg-red-500/20 transition-colors opacity-0 group-hover:opacity-100"
      >
        <Trash2 className="w-4 h-4 text-red-400" />
      </button>
    </motion.div>
  );
}
