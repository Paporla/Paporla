import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen dark:bg-[#0a0a0f] bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Ilustracion */}
        <div className="relative mb-8">
          <div className="text-8xl font-bold dark:text-white/10 text-gray-200 select-none">404</div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
              <svg className="w-12 h-12 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Texto */}
        <h1 className="text-2xl font-bold dark:text-white text-gray-900 mb-3">
          Pagina no encontrada
        </h1>
        <p className="dark:text-gray-400 text-gray-600 mb-8 leading-relaxed">
          Esta pagina no existe o fue eliminada. 
          Pero no te preocupes, aun hay mucha comida esperando ser rescatada.
        </p>

        {/* Acciones */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-white font-medium hover:opacity-90 transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Ir al inicio
          </Link>
          <Link
            href="/packs"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl dark:bg-white/5 bg-gray-100 dark:border-white/10 border-gray-200 dark:text-white text-gray-900 font-medium hover:dark:bg-white/10 hover:bg-gray-200 transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Explorar packs
          </Link>
        </div>

        {/* Footer sutil */}
        <p className="mt-12 text-xs dark:text-gray-600 text-gray-400">
          Paporla -- Rescata comida, no la dejes perder
        </p>
      </div>
    </div>
  )
}
