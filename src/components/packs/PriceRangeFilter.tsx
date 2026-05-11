'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign } from 'lucide-react';

interface PriceRangeFilterProps {
  minPrice: number;
  maxPrice: number;
  onPriceChange: (min: number, max: number) => void;
  minLimit?: number;
  maxLimit?: number;
}

export default function PriceRangeFilter({
  minPrice,
  maxPrice,
  onPriceChange,
  minLimit = 0,
  maxLimit = 100000,
}: PriceRangeFilterProps) {
  const [localMin, setLocalMin] = useState(minPrice);
  const [localMax, setLocalMax] = useState(maxPrice);

  useEffect(() => {
    setLocalMin(minPrice);
    setLocalMax(maxPrice);
  }, [minPrice, maxPrice]);

  const handleMinChange = (value: number) => {
    const newMin = Math.min(value, localMax - 100);
    setLocalMin(newMin);
    onPriceChange(newMin, localMax);
  };

  const handleMaxChange = (value: number) => {
    const newMax = Math.max(value, localMin + 100);
    setLocalMax(newMax);
    onPriceChange(localMin, newMax);
  };

  const formatPrice = (price: number) => {
    return `$${(price / 100).toFixed(2)}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-primary" />
          Rango de precio
        </label>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {formatPrice(localMin)} - {formatPrice(localMax)}
        </span>
      </div>

      <div className="relative pt-4 pb-2">
        <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
          <div
            className="absolute h-2 bg-gradient-to-r from-primary to-primary/60 rounded-full"
            style={{
              left: `${(localMin / maxLimit) * 100}%`,
              right: `${100 - (localMax / maxLimit) * 100}%`,
            }}
          />
        </div>

        <input
          type="range"
          min={minLimit}
          max={maxLimit}
          step={100}
          value={localMin}
          onChange={(e) => handleMinChange(Number(e.target.value))}
          className="absolute top-0 left-0 w-full h-2 opacity-0 cursor-pointer"
        />
        
        <input
          type="range"
          min={minLimit}
          max={maxLimit}
          step={100}
          value={localMax}
          onChange={(e) => handleMaxChange(Number(e.target.value))}
          className="absolute top-0 left-0 w-full h-2 opacity-0 cursor-pointer"
        />

        <div className="relative flex justify-between mt-2">
          <motion.div
            className="text-xs text-gray-600 dark:text-gray-400"
            animate={{ x: (localMin / maxLimit) * 100 + '%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {formatPrice(localMin)}
          </motion.div>
          <motion.div
            className="text-xs text-gray-600 dark:text-gray-400"
            animate={{ x: (localMax / maxLimit) * 100 - 100 + '%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {formatPrice(localMax)}
          </motion.div>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <input
            type="number"
            value={localMin / 100}
            onChange={(e) => handleMinChange(Number(e.target.value) * 100)}
            className="w-full px-3 py-2 rounded-lg bg-white/10 border border-gray-300 dark:border-gray-600 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            placeholder="Mínimo"
          />
        </div>
        <div className="flex-1">
          <input
            type="number"
            value={localMax / 100}
            onChange={(e) => handleMaxChange(Number(e.target.value) * 100)}
            className="w-full px-3 py-2 rounded-lg bg-white/10 border border-gray-300 dark:border-gray-600 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            placeholder="Máximo"
          />
        </div>
      </div>
    </div>
  );
}