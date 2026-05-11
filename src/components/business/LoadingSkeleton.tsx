'use client';

import Skeleton from '@/components/ui/Skeleton';

export default function LoadingSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header skeleton */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 -mt-8 -mx-4 px-4 py-8 rounded-b-3xl">
        <div className="flex items-center gap-4">
          <Skeleton className="w-14 h-14 rounded-xl" />
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
      </div>

      {/* Stats cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-black/40 backdrop-blur-sm rounded-2xl p-5 border border-white/10">
            <div className="flex justify-between">
              <div>
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-7 w-16" />
              </div>
              <Skeleton className="w-10 h-10 rounded-xl" />
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions skeleton */}
      <div>
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-black/40 backdrop-blur-sm rounded-2xl p-4 text-center border border-white/10">
              <Skeleton className="w-12 h-12 rounded-xl mx-auto mb-3" />
              <Skeleton className="h-4 w-20 mx-auto" />
            </div>
          ))}
        </div>
      </div>

      {/* Two column skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <div className="flex justify-between mb-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-8 w-20" />
            </div>
            <div className="space-y-3">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="flex justify-between items-center">
                  <div>
                    <Skeleton className="h-5 w-40 mb-1" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="w-8 h-8 rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}