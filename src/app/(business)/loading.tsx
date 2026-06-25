export default function BusinessLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-[#0a0a1a] dark:via-[#0f0f1a] dark:to-[#020205]">
      <div className="container-page px-4 max-w-7xl mx-auto py-8 space-y-8 animate-pulse">
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
    </div>
  )
}
