'use client';

import { Clock, MapPin, Star, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useFavorites } from '@/hooks/useFavorites';
import { formatPrice } from '@/lib/utils/formatPrice';
import type { PackWithShop } from '@/types/pack';

interface PackCardDefaultProps {
  pack: PackWithShop;
  onClick: () => void;
  className?: string;
  showFavoriteButton?: boolean;
}

export default function PackCardDefault({ 
  pack, 
  onClick, 
  className = '',
  showFavoriteButton = true 
}: PackCardDefaultProps) {
  const [imageError, setImageError] = useState(false);
  const { isFavorite, toggleFavorite } = useFavorites();
  
  const discount = pack.original_price_cents 
    ? Math.round((1 - pack.price_cents / pack.original_price_cents) * 100)
    : null;
  
  const shopRating = pack.shop?.rating || 0;
  const shopVerified = pack.shop?.verified || false;
  const shopId = pack.shop?.id || pack.shop_id;
  const isShopFavorite = shopId ? isFavorite(shopId) : false;
  const isLowStock = pack.remaining_stock <= 3 && pack.remaining_stock > 0;
  const isSoldOut = pack.remaining_stock === 0;
  
  const pickupTime = pack.pickup_start_time && pack.pickup_end_time
    ? `${pack.pickup_start_time.slice(0,5)} - ${pack.pickup_end_time.slice(0,5)}`
    : null;

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (shopId) {
      await toggleFavorite(shopId);
    }
  };

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={`w-full bg-gradient-to-br from-dark-card to-dark-muted border border-dark-border hover:border-primary/30 rounded-2xl overflow-hidden transition-all duration-300 text-left ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header con imagen */}
      <div className="relative h-44 bg-dark-muted flex items-center justify-center overflow-hidden">
        {pack.image_url && !imageError ? (
          <img 
            src={pack.image_url} 
            alt={pack.title} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            onError={() => setImageError(true)}
          />
        ) : (
          <span className="text-6xl">📦</span>
        )}
        
        {discount && (
          <div className="absolute top-3 left-3 bg-primary/90 backdrop-blur-sm text-dark text-xs font-black px-3 py-1 rounded-full">
            -{discount}%
          </div>
        )}
        
        {isLowStock && !isSoldOut && (
          <div className="absolute top-3 right-3 bg-red-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 animate-pulse">
            <span className="w-1.5 h-1.5 bg-white rounded-full" />
            {pack.remaining_stock === 1 ? '¡Último!' : `${pack.remaining_stock} disponibles`}
          </div>
        )}
        
        {isSoldOut && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
            <span className="text-white font-bold text-sm px-4 py-2 bg-red-500/80 rounded-full">
              AGOTADO
            </span>
          </div>
        )}
        
        {showFavoriteButton && (
          <button
            onClick={handleFavoriteClick}
            className="absolute bottom-3 right-3 p-2 bg-black/60 backdrop-blur-sm rounded-full hover:bg-black/80 transition-colors"
          >
            <Heart 
              className={`w-4 h-4 transition-all ${
                isShopFavorite 
                  ? 'fill-red-500 text-red-500' 
                  : 'text-gray-400 hover:text-red-400'
              }`} 
            />
          </button>
        )}
      </div>
      
      {/* Contenido */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
              <span className="text-xs font-semibold text-white">{shopRating.toFixed(1)}</span>
            </div>
            {shopVerified && (
              <>
                <span className="text-gray-700">·</span>
                <span className="text-[10px] text-primary">Verificado</span>
              </>
            )}
          </div>
          {pickupTime && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {pickupTime}
            </span>
          )}
        </div>
        
        <h3 className="font-bold text-white line-clamp-1">{pack.title}</h3>
        
        {pack.description && (
          <p className="text-xs text-gray-400 line-clamp-2">{pack.description}</p>
        )}
        
        <div className="flex items-center justify-between pt-2 border-t border-dark-border/50">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-primary">
              {formatPrice(pack.price_cents)}
            </span>
            {pack.original_price_cents && (
              <span className="text-sm text-gray-600 line-through">
                {formatPrice(pack.original_price_cents)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <MapPin className="w-3.5 h-3.5" />
            <span>{pack.shop?.city || 'Local'}</span>
          </div>
        </div>
      </div>
    </motion.button>
  );
}