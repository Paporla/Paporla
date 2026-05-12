'use client'

export default function PacksLoadingGrid() {
  return (
    <div className="min-h-screen bg-black">
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full border-4 border-primary/30 border-t-primary animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-lg font-medium">Buscando packs...</p>
          <p className="text-gray-600 text-sm mt-1">Cargando las mejores ofertas</p>
        </div>
      </div>
    </div>
  )
}
