'use client'

import { MotionConfig } from 'framer-motion'
import { ThemeProvider } from '@/context/ThemeContext'
import ErrorBoundary from '@/components/ErrorBoundary'
import { QueryProvider } from '@/lib/query/provider'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <QueryProvider>
        {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
        <ThemeProvider>
          <MotionConfig reducedMotion="user">{children}</MotionConfig>
        </ThemeProvider>
      </QueryProvider>
    </ErrorBoundary>
  )
}
