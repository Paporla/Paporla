'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

interface CountdownTimerProps {
  /** Instante ISO completo contra el que se cuenta (p. ej. `pickup_end_at`). */
  targetDate: string
  onExpired?: () => void
}

/**
 * Cuenta atrás hasta un instante absoluto.
 *
 * Antes recibía también un HH:mm (`targetEndTime`, hora del mercado) y lo
 * recomponía sobre la fecha con `setHours`, que opera en la zona horaria del
 * NAVEGADOR: solo acertaba cuando ambas zonas coincidían (piloto chileno).
 * Visto desde otra zona desplazaba el límite horas y mostraba "Tiempo de
 * recogida vencido" con la ventana aún vigente (detectado en el ensayo local
 * del 2026-09-03 probando desde España). Ahora usa el ISO de la base
 * directamente: los instantes absolutos no dependen de quién los mire.
 */
export default function CountdownTimer({ targetDate, onExpired }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<string>('')
  const expiredRef = useRef(false)

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date()
      const deadline = new Date(targetDate)

      // Fecha inválida: sin cuenta atrás, mejor vacío que "NaN m".
      if (Number.isNaN(deadline.getTime())) return

      const diff = deadline.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeLeft('Vencido')
        if (!expiredRef.current) {
          expiredRef.current = true
          onExpired?.()
        }
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hrs = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const secs = Math.floor((diff % (1000 * 60)) / 1000)

      if (days > 0) {
        setTimeLeft(`${days}d ${hrs}h ${mins}m`)
      } else if (hrs > 0) {
        setTimeLeft(`${hrs}h ${mins}m ${secs}s`)
      } else {
        setTimeLeft(`${mins}m ${secs}s`)
      }
    }

    calculateTimeLeft()
    const timer = setInterval(calculateTimeLeft, 1000)
    return () => clearInterval(timer)
  }, [targetDate, onExpired])

  // eslint-disable-next-line
  if (expiredRef.current) {
    return (
      <motion.span
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-red-400 text-xs font-medium"
      >
        Tiempo de recogida vencido
      </motion.span>
    )
  }

  return <span className="text-primary text-sm font-mono font-bold tabular-nums">{timeLeft}</span>
}
