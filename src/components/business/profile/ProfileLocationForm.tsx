'use client'

import { Navigation, MapPin } from 'lucide-react'
import Input from '@/components/ui/Input'
import { useState } from 'react'
import { parseCoordinate, validateCoordinatePair } from '@/lib/utils/coordinates'

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
  const lat = parseCoordinate(latitude)
  const lng = parseCoordinate(longitude)
  // Espejo de los CHECK de la base (0003:142-149) con mensaje en español
  // (F2b: el control dice por qué no se puede guardar, antes del RPC).
  const validation = validateCoordinatePair(latitude, longitude)
  // La vista previa del punto solo con un par COMPLETAMENTE válido: con una
  // coordenada a medias el pin mentiría.
  const isValid = validation.ok && lat !== null && lng !== null

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
          aria-label="Detectar mi ubicación actual"
          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
        >
          <MapPin className="w-3.5 h-3.5" />
          {locating ? 'Detectando...' : 'Detectar mi ubicación'}
        </button>
      </div>

      {isValid ? (
        /* L-16: mapa REAL embebido de OpenStreetMap (gratis, sin clave): el
           placeholder con rejilla se leía como "ni mapa ni nada". El embed es
           interactivo (pan/zoom) y trae su propio aviso de copyright. */
        <div className="space-y-2">
          <div className="relative rounded-2xl overflow-hidden border dark:border-white/10 border-gray-200 h-64 bg-gray-100">
            <iframe
              title="Mapa de ubicacion del comercio"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${(lng - 0.02).toFixed(4)},${(lat - 0.01).toFixed(4)},${(lng + 0.02).toFixed(4)},${(lat + 0.01).toFixed(4)}&layer=mapnik&marker=${lat},${lng}`}
              className="w-full h-full border-0"
              loading="lazy"
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] dark:text-gray-500 text-gray-500 font-mono">
              {lat.toFixed(4)}, {lng.toFixed(4)}
            </p>
            <a
              href={`https://www.google.com/maps?q=${lat},${lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-primary hover:text-primary/80 transition-colors"
            >
              Abrir en Maps →
            </a>
          </div>
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

      {/* F2b: si el par no es válido, decir AQUÍ por qué (y el botón de
          guardar repite el mismo mensaje al intentar guardar). */}
      {!validation.ok && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-xs text-red-400">{validation.error}</p>
        </div>
      )}

      <div className="dark:bg-black/40 bg-gray-50 border dark:border-white/10 border-gray-200 rounded-xl p-4">
        <p className="text-xs dark:text-gray-500 text-gray-400">
          <strong>Ejemplo:</strong> Santiago → Lat: -33.4489, Lng: -70.6693. Puedes obtener coordenadas desde Google
          Maps.
        </p>
      </div>
    </div>
  )
}
