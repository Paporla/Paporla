'use client'

export default function PageLoadingSpinner({ message = 'Cargando...' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">{message}</p>
      </div>
    </div>
  )
}
