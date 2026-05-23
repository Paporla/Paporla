import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import RouteLoader from '@/components/RouteLoader'
import Providers from './providers'
import GoogleAnalytics from '@/components/GoogleAnalytics'
import GoogleTagManager from '@/components/GoogleTagManager'
import { PWAProvider } from '@/components/ui/PWAProvider'
import ThemeScript from '@/components/layout/ThemeScript'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'Paporla - Rescate Alimentario',
    template: '%s | Paporla',
  },
  description:
    'Conectamos comercios con excedentes de comida con personas que necesitan alimentarse. Reduce el desperdicio, ayuda a tu comunidad.',
  keywords: [
    'rescate alimentario',
    'comida',
    'Caracas',
    'desperdicio',
    'packs sorpresa',
    'excedentes',
    'alimentación',
    'Latinoamérica',
  ],
  authors: [{ name: 'Paporla', url: 'https://paporla.com' }],
  creator: 'Paporla',
  publisher: 'Paporla',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://paporla.com'),
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    url: '/',
    siteName: 'Paporla',
    title: 'Paporla - Rescate Alimentario',
    description:
      'Conectamos comercios con excedentes de comida con personas que necesitan alimentarse. Reduce el desperdicio, ayuda a tu comunidad.',
    images: [
      {
        url: '/og-image.svg',
        width: 1200,
        height: 630,
        alt: 'Paporla - Rescate Alimentario',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Paporla - Rescate Alimentario',
    description: 'Conectamos comercios con excedentes de comida con personas que necesitan alimentarse.',
    images: ['/og-image.svg'],
    creator: '@paporla',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  manifest: '/site.webmanifest',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a1a' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className={inter.className}>
        <GoogleTagManager />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-lg"
        >
          Saltar al contenido principal
        </a>
        <Providers>
          <RouteLoader />
          <PWAProvider />
          {children}
          <GoogleAnalytics />
        </Providers>
      </body>
    </html>
  )
}
