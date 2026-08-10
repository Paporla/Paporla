'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Store, Search, MapPin } from 'lucide-react'
import { useShops } from '@/hooks/useShops'
import ShopCard from '@/components/shops/ShopCard'

export default function ShopsPage() {
  const { shops, loading } = useShops()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCity, setSelectedCity] = useState<string>('all')

  // Obtener ciudades únicas
  const cities = useMemo(() => {
    const uniqueCities = [...new Set(shops.map((shop) => shop.city).filter(Boolean))]
    return uniqueCities as string[]
  }, [shops])

  // Filtrar comercios
  const filteredShops = useMemo(() => {
    let filtered = [...shops]

    if (searchTerm) {
      filtered = filtered.filter(
        (shop) =>
          shop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          shop.description?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (selectedCity !== 'all') {
      filtered = filtered.filter((shop) => shop.city === selectedCity)
    }

    return filtered
  }, [shops, searchTerm, selectedCity])

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-12">
          <div className="animate-pulse">
            <div className="h-8 w-48 dark:bg-gray-800 bg-gray-200 rounded mb-2 mx-auto" />
            <div className="h-4 w-96 dark:bg-gray-800 bg-gray-200 rounded mb-8 mx-auto" />
            <div className="flex gap-4 mb-8 justify-center">
              <div className="h-10 w-64 dark:bg-gray-800 bg-gray-200 rounded" />
              <div className="h-10 w-32 dark:bg-gray-800 bg-gray-200 rounded" />
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="dark:bg-gray-900 bg-gray-100 rounded-xl overflow-hidden">
                  <div className="h-40 dark:bg-gray-800 bg-gray-200" />
                  <div className="p-5 space-y-3">
                    <div className="h-6 w-32 dark:bg-gray-800 bg-gray-200 rounded" />
                    <div className="h-4 w-full dark:bg-gray-800 bg-gray-200 rounded" />
                    <div className="h-4 w-24 dark:bg-gray-800 bg-gray-200 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* HEADER */}
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
              <span className="text-gradient">Comercios Asociados</span>
            </h1>

            <p className="dark:text-gray-400 text-gray-600 text-lg max-w-2xl mx-auto">
              Descubre los comercios que se unen al rescate alimentario
            </p>

            <div className="mt-4 text-sm dark:text-gray-500 text-gray-400">
              <span className="text-primary font-semibold">{filteredShops.length}</span> comercios disponibles
            </div>
          </motion.div>
        </div>
      </div>

      {/* FILTROS */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-4 mb-8 max-w-2xl mx-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 dark:text-gray-500 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar comercios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl dark:bg-white/5 bg-white dark:border-white/10 border-gray-200 dark:text-white text-gray-900 placeholder-gray-500 focus:border-primary focus:outline-none transition-all"
            />
          </div>

          {cities.length > 0 && (
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 dark:text-gray-500 text-gray-400" />
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="pl-10 pr-8 py-2.5 rounded-xl dark:bg-white/5 bg-white dark:border-white/10 border-gray-200 dark:text-white text-gray-900 text-sm focus:border-primary focus:outline-none transition-all appearance-none"
              >
                <option value="all">Todas las ciudades</option>
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* RESULTADOS */}
        {filteredShops.length === 0 ? (
          <div className="text-center py-12 dark:bg-black/40 bg-white/60 backdrop-blur-sm rounded-2xl dark:border-white/10 border-gray-200 border">
            <Store className="w-16 h-16 dark:text-gray-600 text-gray-400 mx-auto mb-4" />
            <p className="dark:text-gray-400 text-gray-600">No se encontraron comercios</p>
            <p className="text-sm dark:text-gray-500 text-gray-400 mt-1">Prueba con otros filtros</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredShops.map((shop, index) => (
              <ShopCard key={shop.id} shop={shop} index={index} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
