'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Navigation, AlertCircle, CheckCircle } from 'lucide-react'

interface Coordinates {
  lat: number
  lng: number
}

interface GeolocationFilterProps {
  onLocationChange: (coords: Coordinates | null, radiusKm: number) => void
  defaultRadius?: number
}

export default function GeolocationFilter({ onLocationChange, defaultRadius = 10 }: GeolocationFilterProps) {
  const [location, setLocation] = useState<Coordinates | null>(null)
  const [radius, setRadius] = useState(defaultRadius)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [locationName, setLocationName] = useState<string | null>(null)

  const getLocation = () => {
    setIsLoading(true)
    setError(null)

    if (!navigator.geolocation) {
      setError('Tu navegador no soporta geolocalización')
      setIsLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }
        setLocation(coords)
        onLocationChange(coords, radius)

        // Reverse geocoding para obtener nombre de la ciudad
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}&zoom=10&addressdetails=1`,
          )
          const data = await response.json()
          const city = data.address?.city ?? data.address?.town ?? data.address?.state ?? 'tu ubicación'
          setLocationName(city)
        } catch (err) {
          console.error('Error en reverse geocoding:', err)
          setLocationName('tu ubicación')
        }

        setIsLoading(false)
      },
      (err) => {
        let errorMessage = 'Error al obtener ubicación'
        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMessage = 'Permiso denegado. Activa la ubicación en tu navegador'
            break
          case err.POSITION_UNAVAILABLE:
            errorMessage = 'No se pudo obtener tu ubicación'
            break
          case err.TIMEOUT:
            errorMessage = 'Tiempo de espera agotado'
            break
        }
        setError(errorMessage)
        setIsLoading(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    )
  }

  const handleRadiusChange = (newRadius: number) => {
    setRadius(newRadius)
    if (location) {
      onLocationChange(location, newRadius)
    }
  }

  const clearLocation = () => {
    setLocation(null)
    setLocationName(null)
    onLocationChange(null, radius)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium dark:text-gray-300 text-gray-700 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          Packs cercanos
        </label>
        {location && (
          <button onClick={clearLocation} className="text-xs text-red-500 hover:text-red-600 transition-colors">
            Limpiar
          </button>
        )}
      </div>

      {!location && !isLoading && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={getLocation}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-white font-medium flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-primary/25 transition-all duration-300"
        >
          <Navigation className="w-4 h-4" />
          Usar mi ubicación actual
        </motion.button>
      )}

      {isLoading && (
        <div className="flex items-center justify-center gap-3 py-3">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-600 dark:text-gray-400">Obteniendo ubicación...</span>
        </div>
      )}

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {location && locationName && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-primary" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Mostrando packs cerca de <strong>{locationName}</strong>
              </span>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-600 dark:text-gray-400 mb-2 block">
              Radio de búsqueda: {radius} km
            </label>
            <input
              type="range"
              min={1}
              max={50}
              value={radius}
              onChange={(e) => handleRadiusChange(Number(e.target.value))}
              className="w-full h-2 dark:bg-gray-700 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1 km</span>
              <span>10 km</span>
              <span>25 km</span>
              <span>50 km</span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
