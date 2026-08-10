export default function PacksLoadingGrid() {
  return (
    <div className="min-h-screen dark:bg-black bg-gray-50">
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full border-4 border-primary/30 border-t-primary animate-spin mx-auto mb-4" />
          <p className="dark:text-gray-400 text-gray-600 text-lg font-medium">Buscando packs...</p>
          <p className="dark:text-gray-600 text-gray-400 text-sm mt-1">Cargando las mejores ofertas</p>
        </div>
      </div>
    </div>
  )
}
