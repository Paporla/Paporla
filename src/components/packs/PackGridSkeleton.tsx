'use client'

import Skeleton from '@/components/ui/Skeleton'

export default function PackGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="glass-card rounded-xl p-6">
          <div className="flex justify-between items-start mb-3">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-7 w-20" />
          </div>
          <Skeleton className="h-4 w-40 mb-2" />
          <Skeleton className="h-16 w-full mb-4" />
          <div className="flex justify-between mb-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  )
}