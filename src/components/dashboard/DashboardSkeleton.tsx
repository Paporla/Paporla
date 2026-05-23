'use client'

export default function DashboardSkeleton() {
  return (
    <div className="min-h-screen dark:bg-gradient-to-br dark:from-[#0a0a1a] dark:via-[#0f0f1a] dark:to-[#020205] bg-gray-50">
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full border-4 border-primary/30 border-t-primary animate-spin mx-auto mb-4" />
          <p className="dark:text-gray-400 text-gray-600 text-lg font-medium">Cargando tu panel...</p>
          <p className="dark:text-gray-600 text-gray-400 text-sm mt-1">Preparando tus reservas</p>
        </div>
      </div>
    </div>
  )
}
