'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  glass?: boolean
}

export default function Card({ children, className = '', hover = false, glass = true }: CardProps) {
  return (
    <motion.div
      className={`
        ${glass ? 'glass-card' : 'bg-gray-900/50 backdrop-blur-sm'}
        rounded-xl p-6
        ${hover ? 'transition-all duration-300 hover:-translate-y-1 cursor-pointer' : ''}
        ${className}
      `}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={hover ? { y: -4 } : {}}
    >
      {children}
    </motion.div>
  )
}