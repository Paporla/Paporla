'use client'

import { Star, MapPin, Phone, CheckCircle, Clock, Store } from 'lucide-react'

interface PackDetailShopInfoProps {
  shopName: string
  shopRating: number
  shopVerified: boolean
  shopAddress: string | null
  shopCity: string | null
  shopPhone: string | null
  pickupDate: string | null
  pickupStartTime: string | null
  pickupEndTime: string | null
}

export default function PackDetailShopInfo({
  shopName,
  shopRating,
  shopVerified,
  shopAddress,
  shopCity,
  shopPhone,
  pickupDate,
  pickupStartTime,
  pickupEndTime,
}: PackDetailShopInfoProps) {
  const pickupTime =
    pickupStartTime && pickupEndTime ? `${pickupStartTime.slice(0, 5)} - ${pickupEndTime.slice(0, 5)}` : null

  return (
    <div className="space-y-4">
      {/* Informacion del comercio */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl dark:bg-dark-muted bg-gray-200 flex items-center justify-center">
          <Store className="w-6 h-6 dark:text-gray-400 text-gray-600" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-bold dark:text-white text-gray-900">{shopName}</h2>
            {shopVerified && <CheckCircle className="w-4 h-4 text-primary" />}
          </div>
          <div className="flex items-center gap-2 text-xs dark:text-gray-500 text-gray-400">
            <div className="flex items-center gap-0.5">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              <span>{shopRating.toFixed(1)}</span>
            </div>
            {(shopAddress || shopCity) && (
              <>
                <span>·</span>
                <span className="flex items-center gap-0.5">
                  <MapPin className="w-3 h-3" />
                  {shopCity || shopAddress?.split(',')[0]}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Direccion y telefono */}
      {(shopAddress || shopPhone) && (
        <div className="dark:bg-dark-muted bg-gray-100 rounded-xl p-4 space-y-2">
          {shopAddress && (
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <span className="dark:text-gray-400 text-gray-600">{shopAddress}</span>
            </div>
          )}
          {shopPhone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-primary" />
              <span className="dark:text-gray-400 text-gray-600">{shopPhone}</span>
            </div>
          )}
        </div>
      )}

      {/* Horario de recogida */}
      {(pickupDate || pickupTime) && (
        <div className="dark:bg-dark-muted bg-gray-100 rounded-xl p-4">
          <h3 className="text-sm font-bold dark:text-white text-gray-900 mb-2 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Recogida
          </h3>
          {pickupDate && (
            <p className="text-sm dark:text-gray-400 text-gray-600">
              {new Date(pickupDate).toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          )}
          {pickupTime && <p className="text-sm text-primary font-medium mt-1">{pickupTime}</p>}
        </div>
      )}
    </div>
  )
}
