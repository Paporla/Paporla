'use client'

import Button from '@/components/ui/Button'

export default function Error({ error: _error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-screen dark:bg-black bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
          <span className="text-3xl">!</span>
        </div>
        <h1 className="text-2xl font-bold mb-2">Algo salió mal</h1>
        <p className="dark:text-gray-400 text-gray-600 mb-6">
          Ocurrió un error inesperado. Por favor, intentá de nuevo.
        </p>
        <Button onClick={reset} variant="primary">
          Reintentar
        </Button>
      </div>
    </div>
  )
}
