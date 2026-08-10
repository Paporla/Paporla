export default function AuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <div className="w-48 h-24 bg-gray-800 rounded-xl animate-pulse" />
        </div>

        <div className="text-center mb-8 space-y-2">
          <div className="h-8 w-48 bg-gray-700 rounded-lg mx-auto animate-pulse" />
          <div className="h-4 w-64 bg-gray-600 rounded mx-auto animate-pulse" />
        </div>

        <div className="glass-card rounded-2xl p-6 md:p-8 space-y-5 animate-pulse">
          <div className="space-y-2">
            <div className="h-4 w-24 bg-gray-700 rounded" />
            <div className="h-11 w-full bg-gray-700 rounded-xl" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-20 bg-gray-700 rounded" />
            <div className="h-11 w-full bg-gray-700 rounded-xl" />
          </div>
          <div className="h-12 w-full bg-primary/20 rounded-xl" />
          <div className="h-4 w-48 bg-gray-600 rounded mx-auto" />
        </div>
      </div>
    </div>
  )
}
