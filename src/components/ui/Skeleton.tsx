'use client'

import { motion } from 'framer-motion'

interface SkeletonProps {
  className?: string
  variant?: 'rect' | 'circle' | 'text'
}

export default function Skeleton({ className = '', variant = 'rect' }: SkeletonProps) {
  const variants = {
    rect: 'rounded-xl',
    circle: 'rounded-full',
    text: 'rounded-lg',
  }

  return (
    <motion.div
      className={`shimmer ${variants[variant]} ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    />
  )
}