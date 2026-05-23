import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Mantenimiento',
  description: 'Estamos realizando mejoras. Volveremos en breve.',
  robots: { index: false, follow: false },
}

export default function MantenimientoPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Icono animado */}
        <div className="relative mb-8">
          <div className="w-24 h-24 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <svg
              className="w-12 h-12 text-primary animate-spin-slow"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
        </div>

        <h1 className="text-3xl font-bold dark:text-white text-gray-900 mb-3">Estamos en mantenimiento</h1>
        <p className="dark:text-gray-400 text-gray-600 mb-2 leading-relaxed">
          Estamos realizando mejoras para brindarte una mejor experiencia.
        </p>
        <p className="dark:text-gray-500 text-gray-400 text-sm mb-8">
          Volveremos en unos minutos. Si es urgente, escríbenos a{' '}
          <a href="mailto:hola@paporla.com" className="text-primary hover:underline">
            hola@paporla.com
          </a>
        </p>

        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 text-sm dark:text-gray-600 text-gray-400">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span>Revisando sistemas...</span>
          </div>
          <Link href="/" className="text-sm dark:text-gray-500 text-gray-400 hover:text-primary transition-colors">
            Intentar de nuevo →
          </Link>
        </div>

        <div className="mt-12 p-4 rounded-xl dark:bg-dark-muted/50 bg-gray-100 dark:border-dark-border border-gray-200">
          <p className="text-xs dark:text-gray-600 text-gray-400">Paporla — Rescate Alimentario</p>
        </div>
      </div>
    </div>
  )
}
