'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { X, CalendarCheck, User, Store, Package, CreditCard, Clock, ShieldCheck } from 'lucide-react'
import Button from '@/components/ui/Button'
import { formatMinorPrice } from '@/lib/utils/formatPrice'
import { formatDate, formatPickupWindow } from '@/lib/utils/formatDate'
import { getReservationStatusConfig, getPaymentStatusConfig } from '@/lib/constants/reservationStatus'
import { AdminReservationRow } from '@/components/admin/useAdminReservations'

interface ReservationModalProps {
  isOpen: boolean
  reservation: AdminReservationRow | null
  onClose: () => void
}

/**
 * Ficha de detalle de una reserva (ADMIN-1): todo lo que el panel sabe de la
 * transacción, en un solo vistazo, para responder soporte sin entrar a la
 * base. SOLO LECTURA a propósito: cambiar estados de reserva es territorio
 * del flujo de recogida del comercio (código hasheado) — no hay botones
 * de "arreglar a mano" aquí.
 */
export default function ReservationModal({ isOpen, reservation, onClose }: ReservationModalProps) {
  if (!reservation) return null

  const st = getReservationStatusConfig(reservation.status)
  const pay = getPaymentStatusConfig(reservation.payment_status)
  const tz = reservation.timezone_snapshot || 'America/Santiago'

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Fondo oscuro - ocupa toda la pantalla */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
          />

          {/* Modal centrado */}
          <div className="fixed inset-0 z-[101] flex items-center justify-center pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="pointer-events-auto w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="dark:bg-black/90 bg-white backdrop-blur-xl rounded-2xl dark:border-white/10 border-gray-200 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b dark:border-white/10 border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <CalendarCheck className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold dark:text-white text-gray-900">Detalle de reserva</h2>
                      <p className="text-[11px] dark:text-gray-500 text-gray-400">
                        #{reservation.reservation_id.slice(0, 8)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg dark:hover:bg-white/10 hover:bg-gray-100 transition-colors"
                    aria-label="Cerrar"
                  >
                    <X className="w-5 h-5 dark:text-gray-400 text-gray-600" />
                  </button>
                </div>

                {/* Cuerpo: ficha de la transacción */}
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-xl dark:bg-white/5 bg-gray-100 p-3">
                      <p className="flex items-center gap-1.5 text-[11px] font-medium dark:text-gray-400 text-gray-600 mb-1">
                        <User className="w-3.5 h-3.5" /> Comprador
                      </p>
                      <p className="text-sm font-medium dark:text-white text-gray-900">
                        {reservation.user_name ?? 'Usuario eliminado'}
                      </p>
                      <p className="text-xs dark:text-gray-500 text-gray-400 break-all">
                        {reservation.user_email ?? '—'}
                      </p>
                    </div>

                    <div className="rounded-xl dark:bg-white/5 bg-gray-100 p-3">
                      <p className="flex items-center gap-1.5 text-[11px] font-medium dark:text-gray-400 text-gray-600 mb-1">
                        <Package className="w-3.5 h-3.5" /> Pack
                      </p>
                      <p className="text-sm font-medium dark:text-white text-gray-900">
                        {reservation.pack_title ?? '—'}
                      </p>
                    </div>

                    <div className="rounded-xl dark:bg-white/5 bg-gray-100 p-3 sm:col-span-2">
                      <p className="flex items-center gap-1.5 text-[11px] font-medium dark:text-gray-400 text-gray-600 mb-1">
                        <Store className="w-3.5 h-3.5" /> Comercio
                      </p>
                      <p className="text-sm font-medium dark:text-white text-gray-900">
                        {reservation.shop_name ?? '—'}
                      </p>
                      {reservation.shop_address ? (
                        <p className="text-xs dark:text-gray-500 text-gray-400">{reservation.shop_address}</p>
                      ) : null}
                    </div>

                    <div className="rounded-xl dark:bg-white/5 bg-gray-100 p-3">
                      <p className="flex items-center gap-1.5 text-[11px] font-medium dark:text-gray-400 text-gray-600 mb-1">
                        <Clock className="w-3.5 h-3.5" /> Ventana de recogida
                      </p>
                      <p className="text-sm dark:text-gray-300 text-gray-700">
                        {formatPickupWindow(reservation.pickup_start_at, reservation.pickup_end_at, tz)}
                      </p>
                    </div>

                    <div className="rounded-xl dark:bg-white/5 bg-gray-100 p-3">
                      <p className="flex items-center gap-1.5 text-[11px] font-medium dark:text-gray-400 text-gray-600 mb-1">
                        <CreditCard className="w-3.5 h-3.5" /> Precio
                      </p>
                      <p className="text-sm font-medium dark:text-white text-gray-900">
                        {formatMinorPrice(
                          Number(reservation.total_amount_minor ?? 0),
                          reservation.currency_code,
                          'es-CL',
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Estados */}
                  <div className="flex flex-wrap gap-2">
                    <span className={`text-xs px-3 py-1 rounded-full ${st.className}`}>Reserva: {st.label}</span>
                    <span className={`text-xs px-3 py-1 rounded-full ${pay.className}`}>Pago: {pay.label}</span>
                  </div>

                  {/* Fechas de auditoría */}
                  <p className="text-[11px] dark:text-gray-500 text-gray-400">
                    Creada: {formatDate(reservation.created_at)} · Última actualización:{' '}
                    {formatDate(reservation.updated_at)}
                  </p>

                  {/* Nota honesta sobre el código de retiro */}
                  <div className="flex items-start gap-2 rounded-xl border dark:border-white/10 border-gray-200 p-3">
                    <ShieldCheck className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] dark:text-gray-400 text-gray-600">
                      El código de retiro vive cifrado (hash) en la base por diseño: ni el panel puede mostrarlo ni
                      buscarlo. Para ubicar una reserva usa el nombre o el email del comprador, como en esta búsqueda.
                    </p>
                  </div>

                  <Button onClick={onClose} className="w-full">
                    Cerrar
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
