'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Store, CheckCircle, Ban } from 'lucide-react'
import Button from '@/components/ui/Button'
import { Shop } from '@/types/shop'

interface ShopModalProps {
  isOpen: boolean
  shop: Shop | null
  onClose: () => void
  onVerify: (shopId: string, verified: boolean) => void
  onBan?: (shopId: string, banned: boolean) => void
}

export default function ShopModal({ isOpen, shop, onClose, onVerify, onBan }: ShopModalProps) {
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
                    <h2 className="text-xl font-bold dark:text-white text-gray-900">Editar Comercio</h2>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-1 rounded-lg dark:hover:bg-white/10 hover:bg-gray-100 transition-colors"
                  >
                    <X className="w-5 h-5 dark:text-gray-400 text-gray-600" />
                  </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-5">
                  <div>
                    <label className="block text-sm font-medium dark:text-gray-400 text-gray-600 mb-1">
                      Nombre del comercio
                    </label>
                    <p className="dark:text-white text-gray-900 font-medium">{shop.name}</p>
                  </div>

                  {shop.owner_id && (
                    <div>
                      <label className="block text-sm font-medium dark:text-gray-400 text-gray-600 mb-1">
                        ID del propietario
                      </label>
                      <p className="dark:text-gray-300 text-gray-700 text-sm font-mono break-all">{shop.owner_id}</p>
                    </div>
                  )}

                  {shop.address && (
                    <div>
                      <label className="block text-sm font-medium dark:text-gray-400 text-gray-600 mb-1">
                        Direccion
                      </label>
                      <p className="dark:text-gray-300 text-gray-700">{shop.address}</p>
                    </div>
                  )}

                  <div className="border-t dark:border-white/10 border-gray-200 pt-4 space-y-3">
                    <p className="text-sm dark:text-gray-400 text-gray-600 mb-2">Acciones</p>

                    <div className="flex gap-3">
                      {!shop.verified ? (
                        <Button onClick={() => onVerify(shop.id, true)} className="flex-1 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          Verificar comercio
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={() => onVerify(shop.id, false)}
                          className="flex-1 flex items-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Remover verificación
                        </Button>
                      )}
                    </div>

                    {onBan && (
                      <div className="flex gap-3">
                        {!shop.banned ? (
                          <Button
                            variant="danger"
                            onClick={() => onBan(shop.id, true)}
                            className="flex-1 flex items-center gap-2"
                          >
                            <Ban className="w-4 h-4" />
                            Banear comercio
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            onClick={() => onBan(shop.id, false)}
                            className="flex-1 flex items-center gap-2"
                          >
                            <Ban className="w-4 h-4" />
                            Remover ban
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    <Button type="button" variant="outline" onClick={onClose} className="w-full">
                      Cerrar
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
