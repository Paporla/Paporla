'use client'

import { useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { QrCode, CheckCircle, XCircle, Loader2, Search, ArrowRight } from 'lucide-react'

type ValidationState = 'idle' | 'validating' | 'success' | 'error'

interface ValidationResult {
  state: ValidationState
  message: string
  userName?: string
  packTitle?: string
  quantity?: number
}

export default function PickupCodeValidator() {
  const supabase = supabaseBrowser()
  const [code, setCode] = useState('')
  const [result, setResult] = useState<ValidationResult | null>(null)

  const handleValidate = async () => {
    const cleanCode = code.trim().toUpperCase()
    if (!cleanCode || cleanCode.length < 5) return

    setResult({ state: 'validating', message: 'Validando codigo...' })

    try {
      // Usar RPC validate_pickup que verifica autorizacion, ventana de tiempo y actualiza stats
      const { data, error: rpcError } = await supabase.rpc('validate_pickup', {
        p_pickup_code: cleanCode,
      })

      if (rpcError) {
        setResult({ state: 'error', message: rpcError.message ?? 'Error al validar el codigo.' })
        setCode('')
        return
      }

      if (!data?.success) {
        setResult({ state: 'error', message: data?.error || 'Error al validar el codigo.' })
        setCode('')
        return
      }

      // Buscar info adicional para mostrar confirmacion
      const { data: reservation } = await supabase
        .from('reservations')
        .select('user_id, quantity')
        .eq('id', data.reservation_id)
        .maybeSingle()

      setResult({
        state: 'success',
        message: data.message ?? 'Recogida validada exitosamente!',
        userName: 'Usuario',
        packTitle: 'Pack',
        quantity: reservation?.quantity ?? 1,
      })
      setCode('')
    } catch {
      setResult({ state: 'error', message: 'Error inesperado al validar el codigo.' })
      setCode('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleValidate()
  }

  return (
    <div className="dark:bg-dark-card bg-white border dark:border-dark-border border-gray-200 rounded-2xl overflow-hidden">
      <div className="p-5 border-b dark:border-dark-border border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <QrCode className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold dark:text-white text-gray-900">Validar codigo de recogida</h3>
            <p className="text-xs dark:text-gray-500 text-gray-400">Ingresa el codigo P4P-XXXX del usuario</p>
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
              placeholder="P4P-XXXX"
              maxLength={10}
              className="w-full pl-11 pr-4 py-3 dark:bg-dark-muted bg-gray-50 border dark:border-dark-border border-gray-200 rounded-xl dark:text-white text-gray-900 font-mono text-lg tracking-widest dark:placeholder-gray-600 placeholder-gray-400 focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none transition-all"
              autoComplete="off"
            />
          </div>
          <button
            onClick={handleValidate}
            disabled={code.trim().length < 5 || result?.state === 'validating'}
            className="flex items-center gap-2 bg-primary hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed text-dark font-bold px-6 py-3 rounded-xl transition-all text-sm"
          >
            {result?.state === 'validating' ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Validar <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        <p className="text-xs dark:text-gray-600 text-gray-400 mt-3 flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full dark:bg-gray-600 bg-gray-400" />
          Los codigos aparecen en cada reserva confirmada
        </p>
      </div>

      <AnimatePresence>
        {result && result.state !== 'validating' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`mx-5 mb-5 p-4 rounded-xl border ${
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
                  {result.state === 'success' ? 'Recogida validada!' : 'Error'}
                </p>
                <p className="text-sm dark:text-gray-400 text-gray-600 mt-0.5">{result.message}</p>
                {result.userName && result.packTitle && (
                  <div className="mt-2 text-xs dark:text-gray-500 text-gray-400 space-y-0.5">
                    <p>Usuario: {result.userName}</p>
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
  )
}
