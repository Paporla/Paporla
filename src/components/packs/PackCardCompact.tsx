'use client';

import { Clock, Star, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useFavorites } from '@/hooks/useFavorites';
import { formatPrice } from '@/lib/utils/formatPrice';
import type { PackWithShop } from '@/types/pack';

interface PackCardCompactProps {
  pack: PackWithShop;
  onClick: () => void;
  className?: string;
  showFavoriteButton?: boolean;
}

export default function PackCardCompact({ 
  pack, 
  onClick, 
  className = '',
  showFavoriteButton = true 
}: PackCardCompactProps) {
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
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`flex-shrink-0 w-44 bg-gradient-to-br from-dark-card to-dark-muted border border-dark-border hover:border-primary/30 rounded-2xl overflow-hidden transition-all duration-300 text-left ${className}`}
    >
      {/* Imagen */}
      <div className="h-24 bg-dark-muted flex items-center justify-center relative">
        {pack.image_url && !imageError ? (
          <img 
            src={pack.image_url} 
            alt={pack.title} 
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <span className="text-4xl">📦</span>
        )}
        
        {discount && (
          <div className="absolute top-2 left-2 bg-primary/90 text-dark text-[10px] font-black px-2 py-0.5 rounded-lg">
            -{discount}%
          </div>
        )}
        
        {isLowStock && !isSoldOut && (
          <div className="absolute top-2 right-2 bg-red-500/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-lg animate-pulse">
            ¡Últimos!
          </div>
        )}
        
        {showFavoriteButton && (
          <button
            onClick={handleFavoriteClick}
            className="absolute bottom-2 right-2 p-1.5 bg-black/60 backdrop-blur-sm rounded-full hover:bg-black/80 transition-colors"
          >
            <Heart 
              className={`w-3.5 h-3.5 transition-all ${
                isShopFavorite 
                  ? 'fill-red-500 text-red-500' 
                  : 'text-gray-400 hover:text-red-400'
              }`} 
            />
          </button>
        )}
      </div>
      
      {/* Contenido */}
      <div className="p-3 space-y-1.5">
        <div className="flex items-center gap-1">
          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
          <span className="text-xs text-white">{shopRating.toFixed(1)}</span>
          {shopVerified && (
            <>
              <span className="w-1 h-1 rounded-full bg-gray-600 mx-0.5" />
              <span className="text-[10px] text-primary">✓</span>
            </>
          )}
        </div>
        <p className="text-xs text-gray-500 truncate">{pack.shop?.name}</p>
        <p className="text-sm font-semibold text-white truncate">{pack.title}</p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-black text-primary">
              {formatPrice(pack.price_cents)}
            </span>
            {pack.original_price_cents && (
              <span className="text-xs text-gray-600 line-through">
                {formatPrice(pack.original_price_cents)}
              </span>
            )}
          </div>
          {pickupTime && (
            <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
              <Clock className="w-3 h-3" />
              {pickupTime}
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
}