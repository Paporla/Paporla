'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import PriceRangeFilter from './PriceRangeFilter';
import GeolocationFilter from './GeolocationFilter';

interface Filters {
  search: string;
  minPrice: number;
  maxPrice: number;
  showAvailableOnly: boolean;
  city: string;
  location: { lat: number; lng: number } | null;
  radiusKm: number;
}

interface PackFiltersAdvancedProps {
  onFilterChange: (filters: Filters) => void;
  initialFilters?: Partial<Filters>;
  cities?: string[];
}

export default function PackFiltersAdvanced({ 
  onFilterChange, 
  initialFilters = {},
  cities = ['Caracas', 'Barquisimeto', 'Maracaibo', 'Valencia', 'Maracay']
}: PackFiltersAdvancedProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    search: initialFilters.search || '',
    minPrice: initialFilters.minPrice || 0,
    maxPrice: initialFilters.maxPrice || 100000,
    showAvailableOnly: initialFilters.showAvailableOnly || false,
    city: initialFilters.city || '',
    location: initialFilters.location || null,
    radiusKm: initialFilters.radiusKm || 10,
  });

  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  useEffect(() => {
    let count = 0;
    if (filters.minPrice > 0) count++;
    if (filters.maxPrice < 100000) count++;
    if (filters.showAvailableOnly) count++;
    if (filters.city) count++;
    if (filters.location) count++;
    setActiveFiltersCount(count);
  }, [filters]);

  const handleFilterChange = (key: keyof Filters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleLocationChange = (coords: { lat: number; lng: number } | null, radiusKm: number) => {
    handleFilterChange('location', coords);
    handleFilterChange('radiusKm', radiusKm);
    if (coords) {
      handleFilterChange('city', '');
    }
  };

  const clearAllFilters = () => {
    const resetFilters: Filters = {
      search: '',
      minPrice: 0,
      maxPrice: 100000,
      showAvailableOnly: false,
      city: '',
      location: null,
      radiusKm: 10,
    };
    setFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  return (
    <div className="space-y-4">
      {/* Barra de búsqueda y filtro móvil */}
      <div className="flex gap-3">
        <div className="flex-1">
          <input
            type="text"
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            placeholder="Buscar packs por nombre o descripción..."
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-gray-300 dark:border-gray-600 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          />
        </div>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsOpen(!isOpen)}
          className="relative px-4 py-3 rounded-xl bg-white/10 border border-gray-300 dark:border-gray-600 hover:border-primary transition-all"
        >
          <Filter className="w-5 h-5" />
          {activeFiltersCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </motion.button>
      </div>

      {/* Panel de filtros avanzados */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="glass-card rounded-2xl p-6 backdrop-blur-sm space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gradient">Filtros avanzados</h3>
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Limpiar todos
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Rango de precio */}
                <PriceRangeFilter
                  minPrice={filters.minPrice}
                  maxPrice={filters.maxPrice}
                  onPriceChange={(min, max) => {
                    handleFilterChange('minPrice', min);
                    handleFilterChange('maxPrice', max);
                  }}
                />

                {/* Ciudad */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Ciudad
                  </label>
                  <select
                    value={filters.city}
                    onChange={(e) => {
                      handleFilterChange('city', e.target.value);
                      if (e.target.value) {
                        handleFilterChange('location', null);
                      }
                    }}
                    className="w-full px-4 py-2 rounded-lg bg-white/10 border border-gray-300 dark:border-gray-600 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  >
                    <option value="">Todas las ciudades</option>
                    {cities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Geolocalización */}
                <div className="md:col-span-2">
                  <GeolocationFilter
                    onLocationChange={handleLocationChange}
                    defaultRadius={filters.radiusKm}
                  />
                </div>

                {/* Solo disponibles */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="availableOnly"
                    checked={filters.showAvailableOnly}
                    onChange={(e) => handleFilterChange('showAvailableOnly', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/20"
                  />
                  <label htmlFor="availableOnly" className="text-sm text-gray-700 dark:text-gray-300">
                    Mostrar solo packs con stock disponible
                  </label>
                </div>
              </div>

              {/* Botón para cerrar */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setIsOpen(false)}
                className="w-full py-2 rounded-lg bg-primary/10 text-primary font-medium flex items-center justify-center gap-2 hover:bg-primary/20 transition-all"
              >
                <ChevronUp className="w-4 h-4" />
                Ver resultados
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Etiquetas de filtros activos */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.minPrice > 0 && (
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm flex items-center gap-1">
              Desde ${(filters.minPrice / 100).toFixed(2)}
              <button onClick={() => {
                handleFilterChange('minPrice', 0);
              }} className="hover:text-red-500">×</button>
            </span>
          )}
          {filters.maxPrice < 100000 && (
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm flex items-center gap-1">
              Hasta ${(filters.maxPrice / 100).toFixed(2)}
              <button onClick={() => {
                handleFilterChange('maxPrice', 100000);
              }} className="hover:text-red-500">×</button>
            </span>
          )}
          {filters.city && (
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm flex items-center gap-1">
              {filters.city}
              <button onClick={() => {
                handleFilterChange('city', '');
              }} className="hover:text-red-500">×</button>
            </span>
          )}
          {filters.location && (
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm flex items-center gap-1">
              Cerca de mí ({filters.radiusKm} km)
              <button onClick={() => {
                handleFilterChange('location', null);
              }} className="hover:text-red-500">×</button>
            </span>
          )}
          {filters.showAvailableOnly && (
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm flex items-center gap-1">
              Solo disponibles
              <button onClick={() => {
                handleFilterChange('showAvailableOnly', false);
              }} className="hover:text-red-500">×</button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}