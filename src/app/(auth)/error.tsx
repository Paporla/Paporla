'use client'

import Link from 'next/link'
import Button from '@/components/ui/Button'

export default function AuthError({ error: _error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="relative mb-8">
          <div className="text-8xl font-bold text-black/10 dark:text-white/10 select-none">!</div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-500/20 to-red-500/10 flex items-center justify-center">
              <svg className="w-12 h-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Algo salió mal</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
          Ocurrió un error inesperado. Por favor, intentá de nuevo o volvé al inicio.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset} variant="primary">
            Reintentar
          </Button>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-gray-900 dark:text-white font-medium hover:bg-black/10 dark:hover:bg-white/10 transition-all text-sm"
          >
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  )
}
