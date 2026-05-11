'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, MapPin, Package } from 'lucide-react';
import { usePackSearch } from '@/hooks/usePackSearch';
import PackCard from '@/components/packs/PackCard';
import PackGridSkeleton from '@/components/packs/PackGridSkeleton';
import PackDetail from '@/components/packs/PackDetail';
import type { PackWithShop } from '@/types/pack';

export default function PacksPage() {
  const {
    packs,
    loading,
    filters,
    updateFilter,
  } = usePackSearch();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedPack, setSelectedPack] = useState<PackWithShop | null>(null);

  // Obtener ciudades unicas de los packs
  const cities = useMemo(() => {
    const uniqueCities = [...new Set(packs.map(pack => pack.shop?.city).filter(Boolean))];
    return uniqueCities as string[];
  }, [packs]);

  // Filtrar packs
  const filteredPacks = useMemo(() => {
    let filtered = [...packs];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(pack =>
        pack.title.toLowerCase().includes(term) ||
        pack.description?.toLowerCase().includes(term) ||
        pack.shop?.name.toLowerCase().includes(term)
      );
    }

    if (selectedCity !== 'all') {
      filtered = filtered.filter(pack => pack.shop?.city === selectedCity);
    }

    return filtered;
  }, [packs, searchTerm, selectedCity]);

  const handlePackClick = (pack: PackWithShop) => {
    setSelectedPack(pack);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <div className="container mx-auto px-4 py-12">
          <div className="animate-pulse">
            <div className="h-8 w-48 bg-gray-800 rounded mb-2 mx-auto" />
            <div className="h-4 w-96 bg-gray-800 rounded mb-8 mx-auto" />
            <div className="flex gap-4 mb-8 justify-center">
              <div className="h-10 w-64 bg-gray-800 rounded" />
              <div className="h-10 w-32 bg-gray-800 rounded" />
            </div>
            <PackGridSkeleton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* HEADER CON GRADIENTE (mismo estilo que shops) */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pt-20 pb-12">
        <div className="absolute top-20 left-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-secondary/10 rounded-full blur-3xl animate-pulse delay-1000" />
        
        <div className="container mx-auto px-4 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 leading-tight">
              <span className="text-gradient">Packs Disponibles</span>
            </h1>
            
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Rescata comida deliciosa a precios increibles mientras ayudas al planeta
            </p>

            <div className="mt-4 text-sm text-gray-500">
              <span className="text-primary font-semibold">{filteredPacks.length}</span> packs disponibles
            </div>
          </motion.div>
        </div>
      </div>

      {/* FILTROS (mismo estilo que shops) */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-4 mb-8 max-w-2xl mx-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar packs por nombre, descripcion o comercio..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                updateFilter('search', e.target.value);
              }}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-primary focus:outline-none transition-all"
            />
          </div>
          
          {cities.length > 0 && (
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="pl-10 pr-8 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-primary focus:outline-none transition-all appearance-none"
              >
                <option value="all">Todas las ciudades</option>
                {cities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* RESULTADOS */}
        {filteredPacks.length === 0 ? (
          <div className="text-center py-12 bg-black/40 backdrop-blur-sm rounded-2xl border border-white/10">
            <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No se encontraron packs</p>
            <p className="text-sm text-gray-500 mt-1">Prueba con otros filtros o revisa mas tarde</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPacks.map((pack, index) => (
              <PackCard
                key={pack.id}
                pack={pack}
                onClick={() => handlePackClick(pack)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pack Detail Modal */}
      {selectedPack && (
        <PackDetail
          pack={selectedPack}
          onClose={() => setSelectedPack(null)}
        />
      )}
    </div>
  );
}
