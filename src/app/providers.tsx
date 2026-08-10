'use client'

import { MotionConfig } from 'framer-motion'
import { ThemeProvider } from '@/context/ThemeContext'
import ErrorBoundary from '@/components/ErrorBoundary'
import { QueryProvider } from '@/lib/query/provider'
import { ToastProvider } from '@/components/ui/ToastProvider'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <QueryProvider>
        {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
        <ThemeProvider>
          <ToastProvider>
            <MotionConfig reducedMotion="user">{children}</MotionConfig>
          </ToastProvider>
        </ThemeProvider>
      </QueryProvider>
    </ErrorBoundary>
  )
}
