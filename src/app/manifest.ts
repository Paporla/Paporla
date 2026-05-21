import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Paporla - Rescate Alimentario',
    short_name: 'Paporla',
    description: 'Rescata comida, no la dejes perder. Conectamos comercios con excedentes de comida con personas que necesitan alimentarse.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#00ff88',
    orientation: 'portrait-primary',
    scope: '/',
    lang: 'es',
    categories: ['food', 'lifestyle', 'shopping'],
    icons: [
      {
        src: '/favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/favicon.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
      {
        src: '/favicon.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
    screenshots: [],
    prefer_related_applications: false,
  }
}
