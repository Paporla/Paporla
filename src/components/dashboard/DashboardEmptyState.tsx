'use client'

import Link from 'next/link'
import { Clock } from 'lucide-react'

export default function DashboardEmptyState() {
  return (
    <div className="my-8 card-base rounded-xl p-8 text-center">
      <Clock className="w-12 h-12 dark:text-gray-600 text-gray-400 mx-auto mb-3" />
      <p className="dark:text-gray-400 text-gray-600">No tienes reservas activas</p>
      <Link href="/packs" className="text-primary hover:underline text-sm mt-2 inline-block">
        Explorar packs disponibles →
      </Link>
    </div>
  )
}
