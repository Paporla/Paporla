'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { CheckCircle, MapPin, Clock, Calendar, Navigation, Copy } from 'lucide-react'
import Button from './Button'
import { useState } from 'react'

interface ReservationConfirmationProps {
  reservation: {
    id: string
    pickup_code: string
    pack: {
      title: string
      image_url: string | null
    }
    shop: {
      name: string
      address: string | null
      phone: string | null
    }
    pickup_date: string | null
    pickup_start_time: string | null
    pickup_end_time: string | null
  }
  onClose: () => void
}

export default function ReservationConfirmation({ reservation, onClose }: ReservationConfirmationProps) {
  const [, setCopied] = useState(false)

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(reservation.pickup_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 dark:bg-black/80 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-w-md w-full dark:bg-gray-900 bg-white backdrop-blur-xl rounded-2xl border dark:border-gray-700 border-gray-200 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="text-center pt-8 pb-4 bg-gradient-to-b from-primary/10 to-transparent">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold dark:text-white text-gray-900">Reserva Confirmada!</h2>
          <p className="dark:text-gray-400 text-gray-600 text-sm mt-1">Tu pack ha sido reservado exitosamente</p>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-5">
          {/* Codigo de recogida */}
          <div className="text-center">
            <p className="text-xs dark:text-gray-500 text-gray-400 mb-1">Codigo de recogida</p>
            <div className="flex items-center justify-center gap-3">
              <p className="text-3xl font-bold text-primary tracking-wider font-mono">{reservation.pickup_code}</p>
              <button
                onClick={handleCopyCode}
                className="p-2 rounded-lg dark:bg-gray-800 bg-gray-100 hover:dark:bg-gray-700 hover:bg-gray-200 transition-colors"
              >
                <Copy className="w-4 h-4 dark:text-gray-400 text-gray-600" />
              </button>
            </div>
            <p className="text-xs dark:text-gray-500 text-gray-400 mt-2">Presenta este codigo al recoger tu pedido</p>
          </div>

          {/* Informacion del pack */}
          <div className="border-t dark:border-gray-700 border-gray-200 pt-4">
            <h3 className="font-semibold dark:text-white text-gray-900 mb-2">Detalle de la reserva</h3>
            <div className="flex gap-3">
              {reservation.pack.image_url && (
                <Image
                  src={reservation.pack.image_url}
                  alt=""
                  width={64}
                  height={64}
                  className="w-16 h-16 rounded-lg object-cover"
                />
              )}
              <div>
                <p className="dark:text-white text-gray-900 font-medium">{reservation.pack.title}</p>
                <p className="text-xs dark:text-gray-400 text-gray-600">{reservation.shop.name}</p>
              </div>
            </div>
          </div>

          {/* Informacion de recogida */}
          {(reservation.pickup_date || reservation.pickup_start_time) && (
            <div className="border-t dark:border-gray-700 border-gray-200 pt-4">
              <h3 className="font-semibold dark:text-white text-gray-900 mb-2">Informacion de recogida</h3>
              <div className="space-y-2">
                {reservation.pickup_date && (
                  <div className="flex items-center gap-2 text-sm dark:text-gray-400 text-gray-600">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span>{new Date(reservation.pickup_date).toLocaleDateString()}</span>
                  </div>
                )}
                {(reservation.pickup_start_time || reservation.pickup_end_time) && (
                  <div className="flex items-center gap-2 text-sm dark:text-gray-400 text-gray-600">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>
                      {reservation.pickup_start_time?.slice(0, 5)} - {reservation.pickup_end_time?.slice(0, 5)}
                    </span>
                  </div>
                )}
                {reservation.shop.address && (
                  <div className="flex items-center gap-2 text-sm dark:text-gray-400 text-gray-600">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span>{reservation.shop.address}</span>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(reservation.shop.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:text-primary/80 transition-colors ml-1"
                    >
                      <Navigation className="w-3 h-3" />
                      <span className="text-xs">Como llegar</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3 pt-4">
            <Button onClick={onClose} variant="outline" className="flex-1">
              Cerrar
            </Button>
            <Link href="/dashboard" className="flex-1">
              <Button className="w-full">Ver mis reservas</Button>
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
