'use client'

import { useEffect } from 'react'
import Button from '@/components/ui/Button'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[ErrorBoundary]', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
          <span className="text-3xl">!</span>
        </div>
        <h1 className="text-2xl font-bold mb-2">Algo salió mal</h1>
        <p className="text-gray-400 mb-6">Ocurrió un error inesperado. Ya lo estamos registrando para solucionarlo.</p>
        <Button onClick={reset} variant="primary">
          Intentar de nuevo
        </Button>
      </div>
    </div>
  )
}
