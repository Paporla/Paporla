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
      // Buscar reserva por codigo de recogida
      const { data: reservation, error: searchError } = await supabase
        .from('reservations')
        .select(`
          id, status, pickup_code, user_id, pack_id,
          user:user_id (name),
          pack:pack_id (title)
        `)
        .eq('pickup_code', cleanCode)
        .maybeSingle()

      if (searchError || !reservation) {
        setResult({ state: 'error', message: 'Codigo invalido. No se encontro ninguna reserva con este codigo.' })
        setCode('')
        return
      }

      // Verificar estado valido para recogida
      const validStatuses = ['confirmed', 'ready_pickup']
      if (!validStatuses.includes(reservation.status)) {
        const statusMessages: Record<string, string> = {
          pending: 'La reserva aun no ha sido confirmada.',
          picked_up: 'Este pack ya fue recogido.',
          completed: 'Este pack ya fue completado.',
          cancelled: 'Esta reserva fue cancelada.',
          expired: 'Esta reserva expiro.',
          no_show: 'Esta reserva fue marcada como no retirada.',
        }
        setResult({
          state: 'error',
          message: statusMessages[reservation.status] || 'Estado invalido para recogida.',
        })
        setCode('')
        return
      }

      // Marcar como recogido
      const { error: updateError } = await supabase
        .from('reservations')
        .update({ status: 'picked_up', picked_up_at: new Date().toISOString() })
        .eq('id', reservation.id)

      if (updateError) {
        setResult({ state: 'error', message: 'Error al actualizar la reserva: ' + updateError.message })
        setCode('')
        return
      }

      const userName = (reservation as any).user?.name || 'Usuario'
      const packTitle = (reservation as any).pack?.title || 'Pack'

      setResult({
        state: 'success',
        message: `Recogida validada exitosamente!`,
        userName,
        packTitle,
      })
      setCode('')
    } catch (err) {
      setResult({ state: 'error', message: 'Error inesperado al validar el codigo.' })
      setCode('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleValidate()
  }

  return (
    <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-dark-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <QrCode className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-white">Validar codigo de recogida</h3>
            <p className="text-xs text-gray-500">Ingresa el codigo PAP-XXXX del usuario</p>
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="p-5">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              placeholder="PAP-XXXX"
              maxLength={8}
              className="w-full pl-11 pr-4 py-3 bg-dark-muted border border-dark-border rounded-xl text-white font-mono text-lg tracking-widest placeholder-gray-600 focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none transition-all"
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

        {/* Sugerencias de codigos de prueba */}
        <p className="text-xs text-gray-600 mt-3 flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-600" />
          Los codigos aparecen en cada reserva confirmada
        </p>
      </div>

      {/* Resultado */}
      <AnimatePresence>
        {result && result.state !== 'validating' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`mx-5 mb-5 p-4 rounded-xl border ${
              result.state === 'success'
                ? 'bg-green-500/10 border-green-500/20'
                : 'bg-red-500/10 border-red-500/20'
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
                <p className="text-sm text-gray-400 mt-0.5">{result.message}</p>
                {result.userName && result.packTitle && (
                  <div className="mt-2 text-xs text-gray-500 space-y-0.5">
                    <p>👤 {result.userName}</p>
                    <p>📦 {result.packTitle}</p>
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
