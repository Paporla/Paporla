'use client'

import { MotionConfig } from 'framer-motion'
import { ThemeProvider } from '@/context/ThemeContext'
import ErrorBoundary from '@/components/ErrorBoundary'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <MotionConfig reducedMotion="user">
          {children}
        </MotionConfig>
      </ThemeProvider>
    </ErrorBoundary>
  )
}