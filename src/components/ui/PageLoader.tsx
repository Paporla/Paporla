'use client'

import Skeleton from '@/components/ui/Skeleton'

export default function PageLoader({ message: _message = 'Cargando...' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center space-y-2 mb-6">
          <div className="w-14 h-14 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse mx-auto" />
          <Skeleton className="h-5 w-48 mx-auto" variant="text" />
          <Skeleton className="h-4 w-32 mx-auto" variant="text" />
        </div>
        <div className="rounded-xl border dark:border-white/10 border-gray-200 p-5 space-y-3">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-12 w-full" />
        </div>
        <div className="rounded-xl border dark:border-white/10 border-gray-200 p-5 space-y-3">
          <Skeleton className="h-6 w-1/4" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  )
}
