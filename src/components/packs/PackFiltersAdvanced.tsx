'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Filter, X, ChevronUp } from 'lucide-react'
import PriceRangeFilter from './PriceRangeFilter'
import GeolocationFilter from './GeolocationFilter'
import ActiveFilterChips from './ActiveFilterChips'

interface Filters {
  search: string
  minPrice: number
  maxPrice: number
  showAvailableOnly: boolean
  city: string
  location: { lat: number; lng: number } | null
  radiusKm: number
}

interface Props {
  onFilterChange: (filters: Filters) => void
  initialFilters?: Partial<Filters>
  cities?: string[]
}

const defaultFilters: Filters = {
  search: '',
  minPrice: 0,
  maxPrice: 100000,
  showAvailableOnly: false,
  city: '',
  location: null,
  radiusKm: 10,
}

export default function PackFiltersAdvanced({
  onFilterChange,
  initialFilters = {},
  cities = ['Santiago', 'Valparaíso', 'Concepción', 'La Serena', 'Antofagasta'],
}: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [filters, setFilters] = useState<Filters>({ ...defaultFilters, ...initialFilters })

  const activeCount = [
    filters.minPrice > 0,
    filters.maxPrice < 100000,
    filters.showAvailableOnly,
    !!filters.city,
    !!filters.location,
  ].filter(Boolean).length

  const notify = useCallback(
    (f: Filters) => {
      onFilterChange(f)
    },
    [onFilterChange],
  )

  const update = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    const next = { ...filters, [key]: value }
    setFilters(next)
    notify(next)
  }

  const clearAll = () => {
    setFilters(defaultFilters)
    notify(defaultFilters)
  }

  const removeChip = (key: string) => {
    if (key === 'minPrice') update('minPrice', 0)
    else if (key === 'maxPrice') update('maxPrice', 100000)
    else if (key === 'city') update('city', '')
    else if (key === 'location') update('location', null)
    else if (key === 'showAvailableOnly') update('showAvailableOnly', false)
  }

  // Notificar filtros iniciales al montar
  useEffect(() => {
    onFilterChange(filters)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="flex-1">
          <input
            type="text"
            value={filters.search}
            onChange={(e) => update('search', e.target.value)}
            placeholder="Buscar packs por nombre o descripcion..."
            className="w-full px-4 py-3 rounded-xl dark:bg-white/5 bg-white dark:border-gray-600 border-gray-200 dark:text-white text-gray-900 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          />
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsOpen(!isOpen)}
          className="relative px-4 py-3 rounded-xl dark:bg-white/5 bg-white dark:border-gray-600 border-gray-200 dark:text-white text-gray-900 hover:border-primary transition-all"
        >
          <Filter className="w-5 h-5" />
          {activeCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </motion.button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="glass-card rounded-2xl p-6 backdrop-blur-sm space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gradient">Filtros avanzados</h3>
                <button
                  onClick={clearAll}
                  className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
                >
                  <X className="w-4 h-4" /> Limpiar todos
                </button>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <PriceRangeFilter
                  minPrice={filters.minPrice}
                  maxPrice={filters.maxPrice}
                  onPriceChange={(min, max) => {
                    update('minPrice', min)
                    update('maxPrice', max)
                  }}
                />
                <div>
                  <label className="block text-sm font-medium dark:text-gray-300 text-gray-700 mb-2">Ciudad</label>
                  <select
                    value={filters.city}
                    onChange={(e) => {
                      update('city', e.target.value)
                      if (e.target.value) update('location', null)
                    }}
                    className="w-full px-4 py-2 rounded-lg dark:bg-white/5 bg-white dark:border-gray-600 border-gray-200 dark:text-white text-gray-900 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  >
                    <option value="">Todas las ciudades</option>
                    {cities.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <GeolocationFilter
                    onLocationChange={(coords, radius) => {
                      update('location', coords)
                      update('radiusKm', radius)
                      if (coords) update('city', '')
                    }}
                    defaultRadius={filters.radiusKm}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="availableOnly"
                    checked={filters.showAvailableOnly}
                    onChange={(e) => update('showAvailableOnly', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/20"
                  />
                  <label htmlFor="availableOnly" className="text-sm dark:text-gray-300 text-gray-700">
                    Mostrar solo packs con stock disponible
                  </label>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setIsOpen(false)}
                className="w-full py-2 rounded-lg bg-primary/10 text-primary font-medium flex items-center justify-center gap-2 hover:bg-primary/20 transition-all"
              >
                <ChevronUp className="w-4 h-4" /> Ver resultados
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ActiveFilterChips filters={filters} onRemove={removeChip} />
    </div>
  )
}
