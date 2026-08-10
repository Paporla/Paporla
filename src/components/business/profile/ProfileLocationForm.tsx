'use client'

import { Navigation, MapPin } from 'lucide-react'
import Input from '@/components/ui/Input'
import { useState } from 'react'

interface ProfileLocationFormProps {
  latitude: string
  longitude: string
  onLatitudeChange: (value: string) => void
  onLongitudeChange: (value: string) => void
}

export default function ProfileLocationForm({
  latitude,
  longitude,
  onLatitudeChange,
  onLongitudeChange,
}: ProfileLocationFormProps) {
  const [locating, setLocating] = useState(false)
  const lat = parseFloat(latitude)
  const lng = parseFloat(longitude)
  const isValid = latitude && longitude && !isNaN(lat) && !isNaN(lng)

  const detectLocation = () => {
    if (!navigator.geolocation) {
      alert('La geolocalización no está disponible en este navegador')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onLatitudeChange(position.coords.latitude.toString())
        onLongitudeChange(position.coords.longitude.toString())
        setLocating(false)
      },
      (err) => {
        alert(`Error al detectar ubicación: ${err.message}`)
        setLocating(false)
      },
    )
  }

  return (
    <div className="dark:bg-black/40 bg-white dark:backdrop-blur-sm backdrop-blur-sm border dark:border-white/10 border-gray-200 rounded-2xl p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium dark:text-gray-300 text-gray-700 flex items-center gap-2">
          <Navigation className="w-4 h-4 text-primary" />
          Ubicación
        </label>
        <button
          onClick={detectLocation}
          disabled={locating}
          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
        >
          <MapPin className="w-3.5 h-3.5" />
          {locating ? 'Detectando...' : 'Detectar mi ubicación'}
        </button>
      </div>

      {isValid ? (
        <div className="relative rounded-2xl overflow-hidden border dark:border-white/10 border-gray-200 h-40 dark:bg-black/40 bg-gray-50">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'linear-gradient(rgba(39,211,184,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(39,211,184,0.3) 1px, transparent 1px)',
              backgroundSize: '30px 30px',
            }}
          />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full">
            <div className="relative">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/30 animate-bounce">
                <MapPin className="w-4 h-4 text-black" />
              </div>
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-1.5 bg-primary/30 rounded-full blur-[2px]" />
            </div>
          </div>
          <div className="absolute bottom-3 left-3 dark:bg-black/60 bg-white/80 backdrop-blur-sm border dark:border-white/10 border-gray-200 rounded-lg px-3 py-1.5">
            <p className="text-[10px] dark:text-gray-400 text-gray-600 font-mono">
              {lat.toFixed(4)}, {lng.toFixed(4)}
            </p>
          </div>
          <a
            href={`https://www.google.com/maps?q=${lat},${lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-3 right-3 dark:bg-black/60 bg-white/80 backdrop-blur-sm border dark:border-white/10 border-gray-200 rounded-lg px-3 py-1.5 text-[10px] text-primary hover:text-primary/80 transition-colors"
          >
            Abrir en Maps →
          </a>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed dark:border-white/10 border-gray-200 h-40 dark:bg-black/40 bg-gray-50 flex flex-col items-center justify-center gap-2">
          <MapPin className="w-6 h-6 dark:text-gray-600 text-gray-400" />
          <p className="text-xs dark:text-gray-500 text-gray-400">Ingresa coordenadas para ver el mapa</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Latitud"
          value={latitude}
          onChange={(e) => onLatitudeChange(e.target.value)}
          placeholder="10.4961"
          type="number"
          step="0.000001"
        />
        <Input
          label="Longitud"
          value={longitude}
          onChange={(e) => onLongitudeChange(e.target.value)}
          placeholder="-66.8983"
          type="number"
          step="0.000001"
        />
      </div>

      <div className="dark:bg-black/40 bg-gray-50 border dark:border-white/10 border-gray-200 rounded-xl p-4">
        <p className="text-xs dark:text-gray-500 text-gray-400">
          <strong>Ejemplo:</strong> Santiago → Lat: -33.4489, Lng: -70.6693. Puedes obtener coordenadas desde Google
          Maps.
        </p>
      </div>
    </div>
  )
}
