'use client'

import { BarChart3 } from 'lucide-react'
import type { ShopInfo } from './useBusinessAnalytics'

interface Props { shop: ShopInfo }

export default function BusinessAnalyticsHeader({ shop }: Props) {
  return (
    <div className="section-header -mt-8 -mx-4 px-4 py-8 rounded-b-3xl">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
          <BarChart3 className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-bold dark:text-white text-gray-900">
            Estadisticas
          </h1>
          <p className="dark:text-gray-400 text-gray-600 text-sm mt-1">
            Analisis completo de {shop.name}
          </p>
        </div>
      </div>
    </div>
  )
}
