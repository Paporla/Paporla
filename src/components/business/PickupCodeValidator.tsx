'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { QrCode, CheckCircle, XCircle, Loader2, Search, ArrowRight } from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase/client'
import { translateDbError } from '@/lib/utils/db-errors'

type ValidationState = 'idle' | 'validating' | 'success' | 'error'

interface ValidationResult {
  state: ValidationState
  message: string
  packTitle?: string
  quantity?: number
}

/** Longitud mínima de p_credential en validate_pickup (8..512, 0009:503). */
const MIN_CODE_LENGTH = 8

/**
 * Validador de códigos del piloto.
 *
 * El comercio escribe el código que le da su cliente (emitido una sola vez al
 * confirmar, 0031) y la RPC canónica validate_pickup (0009:503) lo verifica
 * en el servidor: compara la huella sha256, chequea que sea su comercio, que
 * la reserva esté ready_pickup + paid y que estemos dentro de la ventana (con
 * 30 min de gracia). Al validar, la reserva pasa a picked_up y se refrescan
 * las listas. El nombre del parámetro importa: es `p_credential`.
 */
export default function PickupCodeValidator({ shopId }: { shopId: string }) {
  const queryClient = useQueryClient()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<ValidationResult | null>(null)

  const handleValidate = async () => {
    const cleanCode = code.trim().toUpperCase()
    if (cleanCode.length < MIN_CODE_LENGTH || busy) return

    setBusy(true)
    setResult({ state: 'validating', message: 'Validando código...' })
    try {
      const supabase = supabaseBrowser()
      const { data, error } = await supabase.rpc('validate_pickup', { p_credential: cleanCode })

      if (error) {
        setResult({ state: 'error', message: translateDbError(error) })
      } else if (!data?.success) {
        setResult({ state: 'error', message: translateDbError({ message: data?.error }) })
      } else {
        setResult({
          state: 'success',
          message: 'Recogida validada con éxito.',
          packTitle: data.pack_title,
          quantity: data.quantity,
        })
        // La reserva pasó a picked_up: refrescar recogidas de hoy y la lista.
        queryClient.invalidateQueries({ queryKey: ['today-pickups-ready', shopId] })
        queryClient.invalidateQueries({ queryKey: ['today-pickups-confirmed', shopId] })
        queryClient.invalidateQueries({ queryKey: ['business-reservations', shopId] })
      }
      setCode('')
    } finally {
      setBusy(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleValidate()
  }

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="p-5 border-b dark:border-white/10 border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <QrCode className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold dark:text-white text-gray-900">Validar código de recogida</h3>
            <p className="text-xs dark:text-gray-500 text-gray-400">
              Pídele el código a tu cliente (se genera al confirmar la reserva) y escríbelo aquí.
            </p>
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              placeholder="P4P-XXXXXXXX"
              maxLength={12}
              className="w-full pl-11 pr-4 py-3 dark:bg-dark-muted bg-gray-50 border dark:border-dark-border border-gray-200 rounded-xl dark:text-white text-gray-900 font-mono text-lg tracking-widest dark:placeholder-gray-600 placeholder-gray-400 focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none transition-all"
              autoComplete="off"
            />
          </div>
          <button
            onClick={handleValidate}
            disabled={code.trim().length < MIN_CODE_LENGTH || busy}
            className="flex items-center gap-2 bg-primary hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed text-dark font-bold px-6 py-3 rounded-xl transition-all text-sm"
          >
            {busy ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Validar <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        <AnimatePresence>
          {result && result.state !== 'validating' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={`mt-3 p-4 rounded-xl border ${
                result.state === 'success' ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'
              }`}
            >
              <div className="flex items-start gap-3">
                {result.state === 'success' ? (
                  <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <p className={`font-bold text-sm ${result.state === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                    {result.state === 'success' ? '¡Recogida validada!' : 'Error'}
                  </p>
                  <p className="text-sm dark:text-gray-400 text-gray-600 mt-0.5">{result.message}</p>
                  {result.state === 'success' && result.packTitle && (
                    <div className="mt-2 text-xs dark:text-gray-500 text-gray-400 space-y-0.5">
                      <p>Pack: {result.packTitle}</p>
                      {result.quantity && result.quantity > 1 && <p>Cantidad: {result.quantity}</p>}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
