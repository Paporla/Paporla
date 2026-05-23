'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Phone, Globe, Calendar, Clock, ChevronDown, ChevronUp, AtSign, Store, Star } from 'lucide-react'

interface ShopInfo {
  id: string
  name: string
  address: string | null
  city: string | null
  phone: string | null
  website: string | null
  instagram: string | null
  latitude: number | null
  longitude: number | null
  rating: number
  hours: Record<string, { open: string; close: string; closed: boolean }> | string | null
  created_at: string
}

interface ShopDetailInfoProps {
  shop: ShopInfo
  packsCount: number
}

const DAYS_ORDER = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo']

export default function ShopDetailInfo({ shop, packsCount }: ShopDetailInfoProps) {
  const [showHours, setShowHours] = useState(false)

  const memberSince = shop.created_at
    ? new Date(shop.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long' })
    : 'Recientemente'

  // Parse hours
  let hoursData: Record<string, { open: string; close: string; closed: boolean }> = {}
  if (shop.hours) {
    try {
      hoursData = typeof shop.hours === 'string' ? JSON.parse(shop.hours) : shop.hours
    } catch {
      hoursData = {}
    }
  }

  const today = DAYS_ORDER[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]
  const todayStatus = hoursData[today]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="dark:bg-black/40 bg-white backdrop-blur-sm dark:border-white/10 border-gray-200 rounded-2xl p-6 md:p-8 space-y-6"
    >
      {/* Fila superior: info basica */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <h2 className="text-lg font-bold dark:text-white text-gray-900 flex items-center gap-2">
            <Store className="w-5 h-5 text-primary" />
            Informacion
          </h2>

          {(shop.address || shop.city) && (
            <div className="flex items-start gap-3 text-sm">
              <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <span className="dark:text-gray-400 text-gray-600">
                {shop.address}
                {shop.city ? <span className="dark:text-gray-500 text-gray-400">, {shop.city}</span> : ''}
              </span>
            </div>
          )}

          {shop.phone && (
            <a href={'tel:' + shop.phone} className="flex items-center gap-3 text-sm group">
              <Phone className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="dark:text-gray-400 text-gray-600 group-hover:text-primary transition-colors">
                {shop.phone}
              </span>
            </a>
          )}

          {shop.website && (
            <a
              href={shop.website.startsWith('http') ? shop.website : 'https://' + shop.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 text-sm group"
            >
              <Globe className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="dark:text-gray-400 text-gray-600 group-hover:text-primary transition-colors truncate">
                {shop.website}
              </span>
            </a>
          )}

          {shop.instagram && (
            <a
              href={'https://instagram.com/' + shop.instagram.replace('@', '')}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 text-sm group"
            >
              <AtSign className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="dark:text-gray-400 text-gray-600 group-hover:text-primary transition-colors">
                {shop.instagram}
              </span>
            </a>
          )}

          <div className="flex items-center gap-3 text-sm">
            <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="dark:text-gray-400 text-gray-600">Miembro desde {memberSince}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-col items-end justify-start gap-2">
          <div className="text-center dark:bg-white/5 bg-gray-100 dark:border-white/10 border-gray-200 rounded-2xl px-6 py-4">
            <p className="text-3xl font-bold text-primary">{packsCount}</p>
            <p className="text-xs dark:text-gray-500 text-gray-400">
              pack{packsCount !== 1 ? 's' : ''} disponible{packsCount !== 1 ? 's' : ''}
            </p>
          </div>
          {shop.rating > 0 && (
            <div className="flex items-center gap-1 bg-yellow-500/10 border border-yellow-500/20 px-4 py-2 rounded-xl">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="text-yellow-400 font-bold text-sm">{shop.rating.toFixed(1)}</span>
              <span className="text-gray-500 text-xs">/ 5</span>
            </div>
          )}
        </div>
      </div>

      {/* Horarios - Acordeon */}
      {Object.keys(hoursData).length > 0 && (
        <div className="border-t dark:border-white/5 border-gray-200 pt-6">
          <button
            onClick={() => setShowHours(!showHours)}
            className="w-full flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              <span className="text-sm font-semibold dark:text-white text-gray-900">Horarios</span>
              {todayStatus && !todayStatus.closed && (
                <span className="text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">
                  Abierto hoy: {todayStatus.open} - {todayStatus.close}
                </span>
              )}
              {todayStatus?.closed && (
                <span className="text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">Cerrado hoy</span>
              )}
            </div>
            {showHours ? (
              <ChevronUp className="w-4 h-4 dark:text-gray-400 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 dark:text-gray-400 text-gray-500" />
            )}
          </button>

          <AnimatePresence>
            {showHours && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-4 space-y-1">
                  {DAYS_ORDER.map((day) => {
                    const h = hoursData[day]
                    const isToday = day === today
                    return (
                      <div
                        key={day}
                        className={
                          'flex items-center justify-between py-2 px-3 rounded-lg text-sm ' +
                          (isToday ? 'bg-primary/5 border border-primary/10' : '')
                        }
                      >
                        <span
                          className={'font-medium ' + (isToday ? 'text-primary' : 'dark:text-gray-400 text-gray-600')}
                        >
                          {day}
                        </span>
                        <span
                          className={
                            isToday ? 'dark:text-white text-gray-900 font-medium' : 'dark:text-gray-500 text-gray-400'
                          }
                        >
                          {h?.closed ? 'Cerrado' : (h?.open || '--:--') + ' - ' + (h?.close || '--:--')}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Boton de Google Maps */}
      {shop.latitude && shop.longitude && (
        <div className="border-t dark:border-white/5 border-gray-200 pt-4">
          <a
            href={'https://www.google.com/maps?q=' + shop.latitude + ',' + shop.longitude}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3 px-4 bg-primary/10 border border-primary/20 hover:bg-primary/20 rounded-xl text-primary text-sm font-medium transition-all w-full"
          >
            <MapPin className="w-4 h-4" />
            Ver en Google Maps
          </a>
        </div>
      )}
    </motion.div>
  )
}
