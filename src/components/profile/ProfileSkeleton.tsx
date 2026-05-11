'use client';

import Skeleton from '@/components/ui/Skeleton';

export default function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <Skeleton className="w-24 h-24 rounded-2xl" />
          <div className="flex-1 text-center sm:text-left">
            <Skeleton className="h-7 w-40 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="w-32 h-10 rounded-xl" />
        </div>
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-dark-card border border-dark-border rounded-xl p-4 text-center">
            <Skeleton className="w-8 h-8 rounded-lg mx-auto mb-2" />
            <Skeleton className="h-7 w-16 mx-auto mb-1" />
            <Skeleton className="h-3 w-20 mx-auto" />
          </div>
        ))}
      </div>

      {/* Level skeleton */}
      <div className="bg-dark-card border border-dark-border rounded-2xl p-5 space-y-3">
        <div className="flex justify-between">
          <Skeleton className="h-12 w-32" />
          <Skeleton className="h-12 w-20" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Menu skeletons */}
      {[...Array(3)].map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24 mb-2" />
          <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden divide-y divide-dark-border">
            {[...Array(3)].map((_, j) => (
              <div key={j} className="flex items-center gap-3 px-4 py-3.5">
                <Skeleton className="w-9 h-9 rounded-xl" />
                <Skeleton className="flex-1 h-5 w-32" />
                <Skeleton className="w-5 h-5" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}