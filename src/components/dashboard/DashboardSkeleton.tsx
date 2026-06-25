'use client'

export default function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-[#0a0a1a] dark:via-[#0f0f1a] dark:to-[#020205]">
      <div className="container-page px-4 max-w-7xl mx-auto py-8 space-y-8 animate-pulse">
        {/* Welcome Banner Skeleton */}
        <div className="rounded-2xl border dark:border-white/10 border-gray-200 p-6 bg-white/50 dark:bg-black/20">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex-1 space-y-3">
              <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-4 w-48 bg-gray-100 dark:bg-gray-600 rounded" />
            </div>
            <div className="flex gap-3">
              <div className="w-28 h-16 bg-gray-200 dark:bg-gray-700 rounded-xl" />
              <div className="w-28 h-16 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            </div>
          </div>
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="dark:bg-dark-card bg-white border dark:border-dark-border border-gray-200 rounded-2xl p-4"
            >
              <div className="w-8 h-8 rounded-xl bg-gray-200 dark:bg-gray-700 mb-3" />
              <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
              <div className="h-3 w-24 bg-gray-100 dark:bg-gray-600 rounded" />
            </div>
          ))}
        </div>

        {/* Quick Actions + Next Pickup Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="grid grid-cols-2 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-xl border dark:border-white/10 border-gray-200 p-4 bg-white/50 dark:bg-black/20"
                >
                  <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-700 mb-3" />
                  <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-1" />
                  <div className="h-3 w-28 bg-gray-100 dark:bg-gray-600 rounded" />
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="rounded-2xl border dark:border-white/10 border-gray-200 p-5 bg-white/50 dark:bg-black/20">
              <div className="flex gap-4">
                <div className="w-20 h-20 rounded-xl bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-4 w-32 bg-gray-100 dark:bg-gray-600 rounded" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity Skeleton */}
        <div className="space-y-4">
          <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="rounded-xl border dark:border-white/10 border-gray-200 p-4 bg-white/50 dark:bg-black/20 flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-3 w-60 bg-gray-100 dark:bg-gray-600 rounded" />
                </div>
                <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
