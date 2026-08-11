'use client'

import { MotionConfig } from 'framer-motion'
import { ThemeProvider } from '@/context/ThemeContext'
import { AuthProvider } from '@/hooks/useAuth'
import ErrorBoundary from '@/components/ErrorBoundary'
import { QueryProvider } from '@/lib/query/provider'
import { ToastProvider } from '@/components/ui/ToastProvider'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

export default function Providers({ children, nonce }: { children: React.ReactNode; nonce?: string }) {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <QueryProvider>
          {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
          <ThemeProvider>
            <ToastProvider>
              <MotionConfig reducedMotion="user" nonce={nonce}>
                {children}
              </MotionConfig>
            </ToastProvider>
          </ThemeProvider>
        </QueryProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}
