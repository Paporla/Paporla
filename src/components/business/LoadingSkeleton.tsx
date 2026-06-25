export default function LoadingSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-28 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
        <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
      </div>
      <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
    </div>
  )
}
