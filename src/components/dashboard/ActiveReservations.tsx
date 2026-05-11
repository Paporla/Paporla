'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Clock, Package } from 'lucide-react'
import Card from '@/components/ui/Card'
import ReservationCard from './ReservationCard'
import { Reservation } from '@/types/reservation'

interface ActiveReservationsProps {
  reservations: Reservation[]
  onCancel: (id: string) => void
  cancelling: string | null
  activeRef?: React.RefObject<HTMLDivElement>
}

export default function ActiveReservations({ 
  reservations, 
  onCancel, 
  cancelling,
  activeRef 
}: ActiveReservationsProps) {
  return (
    <motion.div
      ref={activeRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5 text-primary" />
        Reservas Activas
        {reservations.length > 0 && (
          <span className="text-sm text-gray-400 ml-2">({reservations.length})</span>
        )}
      </h2>
      
      {reservations.length === 0 ? (
        <Card glass className="text-center py-8">
          <Package className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No tienes reservas activas</p>
          <Link href="/packs" className="text-primary hover:underline text-sm mt-2 inline-block">
            Explorar packs disponibles →
          </Link>
        </Card>
      ) : (
        reservations.map(reservation => (
          <ReservationCard
            key={reservation.id}
            reservation={reservation}
            showCancel={true}
            onCancel={onCancel}
            cancelling={cancelling}
          />
        ))
      )}
    </motion.div>
  )
}