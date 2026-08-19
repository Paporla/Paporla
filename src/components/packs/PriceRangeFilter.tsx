'use client'

import { motion } from 'framer-motion'
import { DollarSign } from 'lucide-react'
import { formatMinorPrice } from '@/lib/utils/formatPrice'

interface PriceRangeFilterProps {
  minPrice: number
  maxPrice: number
  onPriceChange: (min: number, max: number) => void
  minLimit?: number
  maxLimit?: number
  currencyCode?: string
  locale?: string
}

export default function PriceRangeFilter({
  minPrice,
  maxPrice,
  onPriceChange,
  minLimit = 0,
  maxLimit = 100000,
  currencyCode = 'CLP',
  locale = 'es-CL',
}: PriceRangeFilterProps) {
  const handleMinChange = (value: number) => {
    onPriceChange(Math.max(minLimit, Math.min(value, maxPrice - 500)), maxPrice)
  }

  const handleMaxChange = (value: number) => {
    onPriceChange(minPrice, Math.min(maxLimit, Math.max(value, minPrice + 500)))
  }

  const format = (value: number) => formatMinorPrice(value, currencyCode, locale)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium dark:text-gray-300 text-gray-700 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-primary" />
          Rango de precio
        </label>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {format(minPrice)} - {format(maxPrice)}
        </span>
      </div>

      <div className="relative pt-4 pb-2">
        <div className="relative h-2 dark:bg-gray-700 bg-gray-200 rounded-full">
          <div
            className="absolute h-2 bg-gradient-to-r from-primary to-primary/60 rounded-full"
            style={{
              left: `${(minPrice / maxLimit) * 100}%`,
              right: `${100 - (maxPrice / maxLimit) * 100}%`,
            }}
          />
        </div>

        <input
          type="range"
          min={minLimit}
          max={maxLimit}
          step={500}
          value={minPrice}
          onChange={(event) => handleMinChange(Number(event.target.value))}
          className="absolute top-0 left-0 w-full h-2 opacity-0 cursor-pointer"
          aria-label="Precio mínimo"
        />

        <input
          type="range"
          min={minLimit}
          max={maxLimit}
          step={500}
          value={maxPrice}
          onChange={(event) => handleMaxChange(Number(event.target.value))}
          className="absolute top-0 left-0 w-full h-2 opacity-0 cursor-pointer"
          aria-label="Precio máximo"
        />

        <div className="relative flex justify-between mt-2">
          <motion.div className="text-xs text-gray-600 dark:text-gray-400">{format(minPrice)}</motion.div>
          <motion.div className="text-xs text-gray-600 dark:text-gray-400">{format(maxPrice)}</motion.div>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <input
            type="number"
            min={minLimit}
            max={maxLimit}
            step={500}
            value={minPrice}
            onChange={(event) => handleMinChange(Number(event.target.value))}
            className="w-full px-3 py-2 rounded-lg dark:bg-white/10 bg-white dark:border-gray-600 border-gray-200 dark:text-white text-gray-900 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            placeholder="Mínimo"
          />
        </div>
        <div className="flex-1">
          <input
            type="number"
            min={minLimit}
            max={maxLimit}
            step={500}
            value={maxPrice}
            onChange={(event) => handleMaxChange(Number(event.target.value))}
            className="w-full px-3 py-2 rounded-lg dark:bg-white/10 bg-white dark:border-gray-600 border-gray-200 dark:text-white text-gray-900 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            placeholder="Máximo"
          />
        </div>
      </div>
    </div>
  )
}
