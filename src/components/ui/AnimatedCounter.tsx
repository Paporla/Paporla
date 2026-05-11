'use client'

import { useEffect, useState } from 'react'
import { useInView } from 'framer-motion'
import { useRef } from 'react'

interface AnimatedCounterProps {
  value: number
  suffix?: string
  prefix?: string
  duration?: number
  className?: string
}

export default function AnimatedCounter({ 
  value, 
  suffix = '', 
  prefix = '', 
  duration = 2000,
  className = '' 
}: AnimatedCounterProps) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  useEffect(() => {
    if (isInView) {
      let start = 0
      const increment = value / (duration / 16)
      const timer = setInterval(() => {
        start += increment
        if (start >= value) {
          setCount(value)
          clearInterval(timer)
        } else {
          setCount(Math.floor(start))
        }
      }, 16)
      return () => clearInterval(timer)
    }
  }, [isInView, value, duration])

  return (
    <span ref={ref} className={className}>
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  )
}