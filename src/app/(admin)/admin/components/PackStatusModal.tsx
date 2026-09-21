'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Package, Power, PlayCircle } from 'lucide-react'
import Button from '@/components/ui/Button'
import { formatPickupWindow } from '@/lib/utils/formatDate'
import { getPackStatusConfig, PackAdminAction } from '@/lib/constants/packStatus'
import { AdminPackRow } from '@/components/admin/useAdminPacks'

interface PackStatusModalProps {
  isOpen: boolean
  pack: AdminPackRow | null
  /** Acción elegida en la tarjeta: pausar o reactivar. */
  action: PackAdminAction | null
  onClose: () => void
  /**
   * Aplica el cambio vía RPC `admin_set_pack_status` (0055). Devuelve null en
   * éxito (el modal se cierra) o el error ya traducido (se queda abierto y la
   * página muestra el toast), mismo contrato que ShopModal.
   */
  onConfirm: (packId: string, action: PackAdminAction, reason: string) => Promise<string | null>
  /** Cambio en curso: deshabilita el botón de confirmar. */
  busy: boolean
}

/**
 * Modal del interruptor de packs (ADMIN-2): confirma pausar/reactivar con
 * motivo obligatorio de 3+ caracteres (la RPC lo exige y queda en
 * activity_logs). Va montado con `key` para arrancar limpio en cada pack.
 */
export default function PackStatusModal({ isOpen, pack, action, onClose, onConfirm, busy }: PackStatusModalProps) {
  const [reason, setReason] = useState('')

  if (!pack || !action) return null

  const esPausa = action === 'pause'
  const st = getPackStatusConfig(pack.status)
  const reasonOk = reason.trim().length >= 3

  const handleConfirm = async () => {
    if (!reasonOk || busy) return
    const error = await onConfirm(pack.pack_id, action, reason.trim())
    if (error === null) {
      setReason('')
      onClose()
    }
  }

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
              className="pointer-events-auto w-full max-w-md mx-4"
            >
              <div className="dark:bg-black/90 bg-white backdrop-blur-xl rounded-2xl dark:border-white/10 border-gray-200 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b dark:border-white/10 border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      {esPausa ? (
                        <Power className="w-5 h-5 text-amber-400" />
                      ) : (
                        <PlayCircle className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <h2 className="text-xl font-bold dark:text-white text-gray-900">
                      {esPausa ? 'Pausar pack' : 'Reactivar pack'}
                    </h2>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg dark:hover:bg-white/10 hover:bg-gray-100 transition-colors"
                    aria-label="Cerrar"
                  >
                    <X className="w-5 h-5 dark:text-gray-400 text-gray-600" />
                  </button>
                </div>

                {/* Cuerpo */}
                <div className="p-5 space-y-5">
                  <div>
                    <label className="block text-sm font-medium dark:text-gray-400 text-gray-600 mb-1">Pack</label>
                    <div className="flex items-start gap-2">
                      <Package className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="dark:text-white text-gray-900 font-medium">{pack.title}</p>
                        <p className="text-xs dark:text-gray-500 text-gray-400">
                          {pack.shop_name ?? '—'} · stock {pack.remaining_stock}/{pack.total_stock}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium dark:text-gray-400 text-gray-600 mb-1">
                      Estado actual
                    </label>
                    <span className={`text-xs px-3 py-1 rounded-full ${st.className}`}>{st.label}</span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium dark:text-gray-400 text-gray-600 mb-1">
                      Ventana de recogida
                    </label>
                    <p className="text-sm dark:text-gray-300 text-gray-700">
                      {formatPickupWindow(
                        pack.pickup_start_at,
                        pack.pickup_end_at,
                        pack.timezone_snapshot || 'America/Santiago',
                      )}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium dark:text-gray-400 text-gray-600 mb-1">
                      Motivo (mínimo 3 caracteres, queda registrado)
                    </label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={3}
                      maxLength={1000}
                      placeholder={
                        esPausa
                          ? 'Ej: foto del pack no corresponde al producto ofrecido'
                          : 'Ej: el comercio corrigió la foto y pidió reactivarlo'
                      }
                      className="w-full rounded-xl px-3 py-2 text-sm dark:bg-white/5 bg-gray-100 dark:text-white text-gray-900 dark:placeholder-gray-500 placeholder-gray-400 border dark:border-white/10 border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                    />
                  </div>

                  <Button
                    onClick={handleConfirm}
                    disabled={!reasonOk || busy}
                    variant={esPausa ? 'danger' : 'primary'}
                    className="w-full"
                  >
                    {busy ? 'Aplicando…' : esPausa ? 'Pausar pack' : 'Reactivar pack'}
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
