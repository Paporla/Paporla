'use client';

import { ArrowLeft, Share2, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { formatPrice } from '@/lib/utils/formatPrice';

interface PackDetailHeaderProps {
  title: string;
  priceCents: number;
  originalPriceCents: number | null;
  remainingStock: number;
  totalStock: number;
  onBack: () => void;
}

export default function PackDetailHeader({
  title,
  priceCents,
  originalPriceCents,
  remainingStock,
  totalStock,
  onBack,
}: PackDetailHeaderProps) {
  const [liked, setLiked] = useState(false);
  const discount = originalPriceCents
    ? Math.round((1 - priceCents / originalPriceCents) * 100)
    : null;

  const isLowStock = remainingStock <= 3 && remainingStock > 0;

  return (
    <div className="sticky top-0 z-10 flex items-center justify-between p-4 dark:bg-dark/80 bg-white/80 backdrop-blur-xl">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onBack}
        className="p-2 dark:bg-dark-muted bg-gray-200 rounded-full hover:dark:bg-dark-hover hover:bg-gray-300 transition-colors"
      >
        <ArrowLeft className="w-5 h-5 dark:text-white text-gray-900" />
      </motion.button>

      <div className="flex items-center gap-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="p-2 dark:bg-dark-muted bg-gray-200 rounded-full hover:dark:bg-dark-hover hover:bg-gray-300 transition-colors"
        >
          <Share2 className="w-5 h-5 dark:text-white text-gray-900" />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setLiked(!liked)}
          className="p-2 dark:bg-dark-muted bg-gray-200 rounded-full hover:dark:bg-dark-hover hover:bg-gray-300 transition-colors"
        >
          <Heart className={`w-5 h-5 ${liked ? 'fill-red-400 text-red-400' : 'dark:text-white text-gray-900'}`} />
        </motion.button>
      </div>

      {/* Badges flotantes */}
      {discount && (
        <div className="absolute top-20 left-4 bg-primary/90 backdrop-blur-sm text-dark text-xs font-black px-3 py-1 rounded-full">
          -{discount}%
        </div>
      )}

      {isLowStock && (
        <div className="absolute top-20 right-4 bg-red-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 animate-pulse">
          <span className="w-1.5 h-1.5 bg-white rounded-full" />
          {remainingStock === 1 ? 'Ultimo!' : `${remainingStock} disponibles`}
        </div>
      )}

      {/* Precio flotante */}
      <div className="absolute bottom-4 left-4 right-4 dark:bg-dark-card/90 bg-white/90 backdrop-blur-sm rounded-xl p-3 flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-primary">{formatPrice(priceCents)}</span>
          {originalPriceCents && (
            <span className="text-sm dark:text-gray-600 text-gray-400 line-through">{formatPrice(originalPriceCents)}</span>
          )}
        </div>
        <div className="text-xs dark:text-gray-500 text-gray-400">
          Stock: {remainingStock}/{totalStock}
        </div>
      </div>
    </div>
  );
}   
