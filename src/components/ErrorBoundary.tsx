'use client'

import { Component, ReactNode } from 'react'
import Link from 'next/link'
import * as Sentry from '@sentry/nextjs'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo)
    if (process.env.NODE_ENV === 'production') {
      Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } })
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen dark:bg-[#0a0a0f] bg-gray-50 flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <h1 className="text-2xl font-bold dark:text-white text-gray-900 mb-3">Algo salio mal</h1>
            <p className="dark:text-gray-400 text-gray-600 mb-2">Ocurrio un error inesperado. Ya estamos al tanto.</p>
            {this.state.error && (
              <p className="text-xs dark:text-gray-600 text-gray-400 mb-8 font-mono dark:bg-white/5 bg-gray-100 rounded-lg p-3 break-all">
                {this.state.error.message}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-white font-medium hover:opacity-90 transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Reintentar
              </button>
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl dark:bg-white/5 bg-gray-100 dark:border-white/10 border-gray-200 dark:text-white text-gray-900 font-medium hover:dark:bg-white/10 hover:bg-gray-200 transition-all"
              >
                Ir al inicio
              </Link>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
