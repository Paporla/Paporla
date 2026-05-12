'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle, Clock, User, Calendar, Ban, Eye } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import CopyButton from '@/components/ui/CopyButton'
import { formatPrice } from '@/lib/utils/formatPrice'
import { formatDate } from '@/lib/utils/formatDate'
import type { ReservationItem } from './useBusinessReservations'

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'Pendiente', color: 'bg-yellow-500/20 text-yellow-400', icon: Clock },
  confirmed: { label: 'Confirmada', color: 'bg-blue-500/20 text-blue-400', icon: CheckCircle },
  ready_pickup: { label: 'Lista', color: 'bg-green-500/20 text-green-400', icon: CheckCircle },
  picked_up: { label: 'Recogido', color: 'bg-green-500/20 text-green-400', icon: CheckCircle },
  completed: { label: 'Completada', color: 'bg-green-500/20 text-green-400', icon: CheckCircle },
  cancelled: { label: 'Cancelada', color: 'bg-red-500/20 text-red-400', icon: XCircle },
  no_show: { label: 'No retirado', color: 'bg-gray-500/20 text-gray-400', icon: Ban },
}

interface Props {
  reservation: ReservationItem
  index: number
  updating: string | null
  onValidate: (id: string) => void
  onNoShow: (id: string) => void
  onCancelClick: (id: string) => void
}

export default function ReservationCard({ reservation, index, updating, onValidate, onNoShow, onCancelClick }: Props) {
  const config = statusConfig[reservation.status] || statusConfig.pending
  const StatusIcon = config.icon
  const canAct = ['confirmed', 'pending', 'ready_pickup'].includes(reservation.status)
  const showCode = ['confirmed', 'pending'].includes(reservation.status)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <Card glass hover className="p-5 group">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h3 className="text-lg font-semibold text-white group-hover:text-primary transition-colors">
                {reservation.pack.title}
              </h3>
              <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${config.color}`}>
                <StatusIcon className="w-3 h-3" /> {config.label}
              </span>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-gray-300 flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                {reservation.user.name} ({reservation.user.email})
              </p>
              {reservation.user.phone && (
                <p className="text-xs text-gray-500 flex items-center gap-1">📞 {reservation.user.phone}</p>
              )}
              <p className="text-xs text-gray-500 flex items-center gap-2">
                <Calendar className="w-3 h-3" />
                {formatDate(reservation.created_at)}
              </p>
              <p className="text-sm text-primary font-semibold">
                {reservation.quantity}x • {formatPrice(reservation.total_price_cents)}
              </p>
            </div>

            {showCode && (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <div className="bg-primary/10 border border-primary/30 rounded-lg px-3 py-1.5 flex items-center gap-2">
                  <p className="text-lg font-bold text-primary tracking-wider font-mono">
                    {reservation.pickup_code}
                  </p>
                  <CopyButton text={reservation.pickup_code} label="Copiar" />
                </div>
                {reservation.pickup_date && reservation.pickup_end_time && (
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Recoge antes de: {new Date(reservation.pickup_date).toLocaleDateString()} {reservation.pickup_end_time?.slice(0,5)}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {canAct && (
              <>
                <Button size="sm" onClick={() => onValidate(reservation.id)} disabled={updating === reservation.id} className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" /> Validar
                </Button>
                <Button variant="outline" size="sm" onClick={() => onNoShow(reservation.id)} disabled={updating === reservation.id}
                  className="flex items-center gap-1 text-gray-400 hover:text-white border-gray-600">
                  <Ban className="w-4 h-4" /> No retiró
                </Button>
                <Button variant="danger" size="sm" onClick={() => onCancelClick(reservation.id)} disabled={updating === reservation.id}
                  className="flex items-center gap-1">
                  <XCircle className="w-4 h-4" /> Cancelar
                </Button>
              </>
            )}
            <Link href={`/packs/${reservation.pack.id}`}>
              <Button variant="outline" size="sm" className="p-2">
                <Eye className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
