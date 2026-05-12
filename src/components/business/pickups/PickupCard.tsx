'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Clock, CheckCircle, User, Package, X, Ban } from 'lucide-react'
import Button from '@/components/ui/Button'
import CopyButton from '@/components/ui/CopyButton'

export interface PickupItem {
  id: string
  pickup_code: string
  pickup_date: string | null
  pickup_start_time: string | null
  pickup_end_time: string | null
  status: string
  user_name: string
  pack_title: string
  pack_id: string
  user_id: string
}

function isWithinWindow(p: PickupItem): boolean {
  if (!p.pickup_date || !p.pickup_start_time || !p.pickup_end_time) return true
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const t = now.toTimeString().slice(0, 5)
  if (p.pickup_date !== today) return false
  if (t < p.pickup_start_time.slice(0, 5)) return false
  if (t > p.pickup_end_time.slice(0, 5)) return false
  return true
}

function isAfterWindow(p: PickupItem): boolean {
  if (!p.pickup_date || !p.pickup_end_time) return false
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const t = now.toTimeString().slice(0, 5)
  if (p.pickup_date < today) return true
  if (p.pickup_date === today && t > p.pickup_end_time.slice(0, 5)) return true
  return false
}

interface Props {
  pickup: PickupItem
  index: number
  validating: string | null
  onValidate: (pickup: PickupItem, code: string) => Promise<string | null>
}

export default function PickupCard({ pickup, index, validating, onValidate }: Props) {
  const [showInput, setShowInput] = useState(false)
  const [codeInput, setCodeInput] = useState('')
  const [error, setError] = useState('')

  const inWindow = isWithinWindow(pickup)
  const afterWindow = isAfterWindow(pickup)

  const handleStart = () => {
    if (!inWindow) {
      if (afterWindow) {
        setError('Ventana de recogida expirada')
      } else {
        setError('Aun no es la hora (' + pickup.pickup_start_time?.slice(0,5) + ' - ' + pickup.pickup_end_time?.slice(0,5) + ')')
      }
      return
    }
    setShowInput(true)
    setCodeInput('')
    setError('')
  }

  const handleVerify = async () => {
    if (!codeInput.trim()) { setError('Ingresa el codigo'); return }
    if (codeInput.trim().toUpperCase() !== pickup.pickup_code.toUpperCase()) {
      setError('Codigo incorrecto'); return
    }
    const err = await onValidate(pickup, pickup.pickup_code)
    if (err) setError(err)
    else setShowInput(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0 }}
      transition={{ delay: index * 0.05 }}
      className={'bg-gradient-to-r from-white/5 to-transparent border rounded-xl p-4 transition-all ' + (
        afterWindow ? 'border-red-500/30 bg-red-500/5' : inWindow ? 'border-primary/30' : 'border-white/10'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <User className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <span className="font-semibold text-white truncate">{pickup.user_name}</span>
            {afterWindow && (
              <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Ban className="w-3 h-3" /> Vencida
              </span>
            )}
            {inWindow && (
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Clock className="w-3 h-3" /> En horario
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Package className="w-3 h-3" />
            <span className="truncate">{pickup.pack_title}</span>
          </div>
          {pickup.pickup_start_time && (
            <div className="flex items-center gap-1 text-xs mt-1">
              <Clock className="w-3 h-3 text-gray-500" />
              <span className={inWindow ? 'text-green-400' : afterWindow ? 'text-red-400' : 'text-gray-500'}>
                {pickup.pickup_start_time.slice(0,5)} - {pickup.pickup_end_time?.slice(0,5)}
                {inWindow ? ' (Ahora)' : afterWindow ? ' (Vencido)' : ''}
              </span>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 text-right">
          <p className="text-xs text-gray-500">Codigo</p>
          <p className="text-lg font-bold text-primary tracking-wider font-mono">{pickup.pickup_code}</p>
          <div className="flex gap-1 mt-1 justify-end">
            <CopyButton text={pickup.pickup_code} label="" />
          </div>
        </div>
      </div>

      {showInput ? (
        <div className="mt-3 pt-3 border-t border-white/10">
          <p className="text-xs text-gray-400 mb-2">Ingresa el codigo de recogida para confirmar:</p>
          <div className="flex gap-2">
            <input
              type="text" value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder="Ej: P4P-XXX-XXX"
              className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm font-mono uppercase placeholder:text-gray-600 focus:border-primary focus:outline-none"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
            />
            <Button size="sm" onClick={handleVerify} disabled={validating === pickup.id}>
              {validating === pickup.id ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : <CheckCircle className="w-4 h-4" />}
              Validar
            </Button>
            <button onClick={() => { setShowInput(false); setError('') }} className="p-2 text-gray-500 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
        </div>
      ) : (
        <div className="mt-3 pt-3 border-t border-white/10 flex justify-end">
          <Button size="sm" onClick={handleStart} disabled={validating === pickup.id || afterWindow}
            className={'flex items-center gap-1 ' + (afterWindow ? 'opacity-50 cursor-not-allowed' : '')}>
            <CheckCircle className="w-4 h-4" /> Validar recogida
          </Button>
          {error && <p className="text-xs text-red-400 ml-2 self-center">{error}</p>}
        </div>
      )}
    </motion.div>
  )
}
