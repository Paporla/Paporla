'use client';

import { Star, MapPin, Phone, CheckCircle, Clock } from 'lucide-react';

interface PackDetailShopInfoProps {
  shopName: string;
  shopRating: number;
  shopVerified: boolean;
  shopAddress: string | null;
  shopCity: string | null;
  shopPhone: string | null;
  pickupDate: string | null;
  pickupStartTime: string | null;
  pickupEndTime: string | null;
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
  const pickupTime = pickupStartTime && pickupEndTime
    ? `${pickupStartTime.slice(0,5)} - ${pickupEndTime.slice(0,5)}`
    : null;

  return (
    <div className="space-y-4">
      {/* Información del comercio */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-dark-muted flex items-center justify-center text-2xl">
          🏪
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-white">{shopName}</h2>
            {shopVerified && (
              <CheckCircle className="w-4 h-4 text-primary" />
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
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

      {/* Dirección y teléfono */}
      {(shopAddress || shopPhone) && (
        <div className="bg-dark-muted rounded-xl p-4 space-y-2">
          {shopAddress && (
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <span className="text-gray-400">{shopAddress}</span>
            </div>
          )}
          {shopPhone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-primary" />
              <span className="text-gray-400">{shopPhone}</span>
            </div>
          )}
        </div>
      )}

      {/* Horario de recogida */}
      {(pickupDate || pickupTime) && (
        <div className="bg-dark-muted rounded-xl p-4">
          <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Recogida
          </h3>
          {pickupDate && (
            <p className="text-sm text-gray-400">
              {new Date(pickupDate).toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          )}
          {pickupTime && (
            <p className="text-sm text-primary font-medium mt-1">
              {pickupTime}
            </p>
          )}
        </div>
      )}
    </div>
  );
}