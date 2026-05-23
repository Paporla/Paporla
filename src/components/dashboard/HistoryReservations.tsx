'use client'

import { motion } from 'framer-motion'
import ReservationCard from './ReservationCard'
import { Reservation } from '@/types/reservation'

interface HistoryReservationsProps {
  reservations: Reservation[]
  historyRef?: React.RefObject<HTMLDivElement>
}

export default function HistoryReservations({ reservations, historyRef }: HistoryReservationsProps) {
  if (reservations.length === 0) return null

  return (
    <motion.div
      ref={historyRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <h2 className="text-2xl font-semibold dark:text-white text-gray-900 mb-4">Historial</h2>
      {reservations.map((reservation) => (
        <ReservationCard key={reservation.id} reservation={reservation} showCancel={false} />
      ))}
    </motion.div>
  )
}
