'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

interface CountdownTimerProps {
  targetDate: string // Fecha ISO
  targetEndTime: string // HH:mm
  onExpired?: () => void
}

export default function CountdownTimer({ targetDate, targetEndTime, onExpired }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<string>('')
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date()

      // Combinar fecha + hora
      const [hours, minutes] = targetEndTime.split(':').map(Number)
      const deadline = new Date(targetDate)
      deadline.setHours(hours, minutes, 0, 0)

      const diff = deadline.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeLeft('Vencido')
        if (!expired) {
          setExpired(true)
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
  }, [targetDate, targetEndTime])

  if (expired) {
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
