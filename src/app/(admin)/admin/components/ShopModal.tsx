'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Store, CheckCircle, XCircle, Ban } from 'lucide-react'
import Button from '@/components/ui/Button'
import { formatDate } from '@/lib/utils/formatDate'
import { getShopStatusConfig, SHOP_MODERATION_ACTIONS, ShopModerationAction } from '@/lib/constants/shopStatus'
import { AdminShop } from '@/components/admin/useAdminShops'

interface ShopModalProps {
  isOpen: boolean
  shop: AdminShop | null
  onClose: () => void
  /**
   * Modera el comercio (RPC `admin_review_shop`, 0009:1383). Devuelve null en
   * éxito (el modal se cierra) o el error ya traducido (se queda abierto y la
   * página muestra el toast).
   */
  onModerate: (shopId: string, newStatus: ShopModerationAction, reason: string) => Promise<string | null>
  /** Moderación en curso: deshabilita el botón de confirmar. */
  busy: boolean
}

const ACTION_LABELS: Record<ShopModerationAction, string> = {
  verified: 'Verificar comercio',
  rejected: 'Rechazar comercio',
  suspended: 'Suspender comercio',
}

const ACTION_ICONS = {
  verified: CheckCircle,
  rejected: XCircle,
  suspended: Ban,
} as const

/**
 * Cuerpo del modal con su propio estado (acción elegida + motivo). Va montado
 * con `key={shop.shop_id}` para que al abrir otro comercio arranque limpio
 * sin efectos con setState.
 */
function ModerationBody({
  shop,
  onClose,
  onModerate,
  busy,
}: {
  shop: AdminShop
  onClose: () => void
  onModerate: ShopModalProps['onModerate']
  busy: boolean
}) {
  const [action, setAction] = useState<ShopModerationAction | null>(null)
  const [reason, setReason] = useState('')

  const statusConfig = getShopStatusConfig(shop.status)
  const reasonOk = reason.trim().length >= 3
  // `closed` no es moderable: `admin_review_shop` lo rechaza (SHOP_NOT_FOUND).
  const isClosed = shop.status === 'closed'
  const availableActions = SHOP_MODERATION_ACTIONS.filter((a) => a !== shop.status)

  const handleConfirm = async () => {
    if (!action || !reasonOk || busy) return
    const error = await onModerate(shop.shop_id, action, reason.trim())
    if (error === null) onClose()
  }

  return (
    <div className="p-5 space-y-5">
      <div>
        <label className="block text-sm font-medium dark:text-gray-400 text-gray-600 mb-1">Nombre del comercio</label>
        <p className="dark:text-white text-gray-900 font-medium">{shop.name}</p>
      </div>

      <div>
        <label className="block text-sm font-medium dark:text-gray-400 text-gray-600 mb-1">Propietario</label>
        <p className="dark:text-gray-300 text-gray-700 text-sm">
          {shop.owner_name ?? 'Sin nombre'}
          {shop.owner_email ? ` · ${shop.owner_email}` : ''}
        </p>
      </div>

      {shop.address_line1 && (
        <div>
          <label className="block text-sm font-medium dark:text-gray-400 text-gray-600 mb-1">Dirección</label>
          <p className="dark:text-gray-300 text-gray-700 text-sm">{shop.address_line1}</p>
        </div>
      )}

      {/* Datos legales declarados (0038/0039). El cotejo es la base de la
          verificación: RUT contra el SII (consulta de situación tributaria de
          terceros), resolución contra la SEREMI. "No declarado" en ámbar avisa
          de que aún no se puede verificar. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium dark:text-gray-400 text-gray-600 mb-1">
            RUT declarado (cotejar en SII)
          </label>
          {shop.tax_id ? (
            <p className="dark:text-gray-300 text-gray-700 text-sm font-mono">{shop.tax_id}</p>
          ) : (
            <p className="text-sm dark:text-amber-400 text-amber-600">No declarado</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium dark:text-gray-400 text-gray-600 mb-1">
            Resolución sanitaria (cotejar en SEREMI)
          </label>
          {shop.sanitary_resolution ? (
            <p className="dark:text-gray-300 text-gray-700 text-sm">{shop.sanitary_resolution}</p>
          ) : (
            <p className="text-sm dark:text-amber-400 text-amber-600">No declarada</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm dark:text-gray-400 text-gray-600">Estado actual:</span>
        <span className={`text-xs px-2 py-1 rounded-full ${statusConfig.className}`}>{statusConfig.label}</span>
      </div>

      {shop.status_reason && (
        <div>
          <label className="block text-sm font-medium dark:text-gray-400 text-gray-600 mb-1">
            Motivo de la última decisión
          </label>
          <p className="dark:text-gray-300 text-gray-700 text-sm">{shop.status_reason}</p>
        </div>
      )}

      {shop.reviewed_at && (
        <div>
          <label className="block text-sm font-medium dark:text-gray-400 text-gray-600 mb-1">Última revisión</label>
          <p className="dark:text-gray-300 text-gray-700 text-sm">{formatDate(shop.reviewed_at)}</p>
        </div>
      )}

      <div className="border-t dark:border-white/10 border-gray-200 pt-4">
        {isClosed ? (
          <p className="text-sm dark:text-gray-400 text-gray-600">
            Este comercio está cerrado y no puede moderarse desde el panel.
          </p>
        ) : action === null ? (
          <div className="space-y-3">
            <p className="text-sm dark:text-gray-400 text-gray-600">¿Qué quieres hacer con este comercio?</p>
            <div className="flex flex-col gap-2">
              {availableActions.map((a) => {
                const Icon = ACTION_ICONS[a]
                return (
                  <Button
                    key={a}
                    variant={a === 'verified' ? 'primary' : 'outline'}
                    onClick={() => setAction(a)}
                    disabled={busy}
                    className="flex items-center gap-2"
                  >
                    <Icon className="w-4 h-4" />
                    {ACTION_LABELS[a]}
                  </Button>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium dark:text-white text-gray-900">¿{ACTION_LABELS[action]}?</p>
              <button
                onClick={() => setAction(null)}
                className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
              >
                Elegir otra
              </button>
            </div>
            <div>
              <label
                htmlFor="motivo-moderacion"
                className="block text-sm font-medium dark:text-gray-400 text-gray-600 mb-1"
              >
                Motivo (obligatorio)
              </label>
              <textarea
                id="motivo-moderacion"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Ej: faltan datos de seguridad alimentaria"
                className="w-full px-4 py-2.5 rounded-xl dark:bg-white/5 bg-white dark:border-white/10 border-gray-200 dark:text-white text-gray-900 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 resize-none"
              />
              {!reasonOk && (
                <p className="mt-1.5 text-xs text-amber-500 dark:text-amber-400">
                  Mínimo 3 caracteres (la base lo exige).
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={onClose} disabled={busy} className="flex-1">
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => void handleConfirm()}
                disabled={!reasonOk || busy}
                className="flex-1"
              >
                Confirmar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ShopModal({ isOpen, shop, onClose, onModerate, busy }: ShopModalProps) {
  // Prevenir scroll del body cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!shop) return null

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

          {/* Modal centrado - FORZADO */}
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
                      <Store className="w-5 h-5 text-primary" />
                    </div>
                    <h2 className="text-xl font-bold dark:text-white text-gray-900">Moderar comercio</h2>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-1 rounded-lg dark:hover:bg-white/10 hover:bg-gray-100 transition-colors"
                  >
                    <X className="w-5 h-5 dark:text-gray-400 text-gray-600" />
                  </button>
                </div>

                {/* Body (key: estado limpio al abrir otro comercio) */}
                <ModerationBody key={shop.shop_id} shop={shop} onClose={onClose} onModerate={onModerate} busy={busy} />
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
