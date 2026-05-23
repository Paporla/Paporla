export default function AdminStatsLoading() {
  return (
    <div className="space-y-8">
      <div>
        <div className="h-8 w-52 dark:bg-gray-800 bg-gray-200 rounded-lg animate-pulse mb-2" />
        <div className="h-4 w-72 dark:bg-gray-800 bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 dark:bg-gray-900 bg-gray-200 rounded-2xl animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="h-96 dark:bg-gray-900 bg-gray-200 rounded-2xl animate-pulse" />
        <div className="h-96 dark:bg-gray-900 bg-gray-200 rounded-2xl animate-pulse" />
      </div>
    </div>
  )
}
