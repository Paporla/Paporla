'use client'

import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Store, CheckCircle, ExternalLink } from 'lucide-react'

interface ShopData {
  id: string
  name: string
  description: string | null
  address: string | null
  city: string | null
  phone: string | null
  logo_url: string | null
  rating: number
  verified: boolean
}

interface PackShopCardProps {
  shop: ShopData
}

export default function PackShopCard({ shop }: PackShopCardProps) {
  return (
    <Link href={`/shops/${shop.id}`}>
      <div className="p-4 glass-card rounded-xl cursor-pointer hover:border-primary/50 transition-all group">
        <div className="flex items-center gap-3">
          {shop.logo_url ? (
            <Image src={shop.logo_url} alt={shop.name} width={48} height={48} className="w-12 h-12 rounded-full object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <Store className="w-6 h-6 text-primary" />
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold dark:text-white text-gray-900 group-hover:text-primary transition-colors">
                {shop.name}
              </p>
              {shop.verified && (
                <CheckCircle className="w-4 h-4 text-green-400" />
              )}
            </div>
            {shop.address && (
              <p className="text-xs dark:text-gray-400 text-gray-600 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {shop.address}
                {shop.city && <span className="dark:text-gray-500 text-gray-400">({shop.city})</span>}
              </p>
            )}
          </div>
          <ExternalLink className="w-4 h-4 dark:text-gray-400 text-gray-600 group-hover:text-primary transition-colors" />
        </div>
      </div>
    </Link>
  )
}
