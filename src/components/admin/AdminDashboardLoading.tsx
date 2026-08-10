'use client'

export default function AdminDashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header skeleton */}
      <div className="h-28 bg-gray-200 dark:bg-gray-800 rounded-2xl" />

      {/* Nav cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-32 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
        ))}
      </div>

      {/* Stat cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
        ))}
      </div>

      {/* Two columns skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
        <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
      </div>

      {/* Activity skeleton */}
      <div className="h-80 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
    </div>
  )
}
