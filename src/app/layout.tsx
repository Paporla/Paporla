import type { Metadata, Viewport } from 'next'
import { headers } from 'next/headers'
import { Inter } from 'next/font/google'
import './globals.css'
import RouteLoader from '@/components/RouteLoader'
import Providers from './providers'
import GoogleAnalytics from '@/components/GoogleAnalytics'
import GoogleTagManager from '@/components/GoogleTagManager'
import CookieConsentBanner from '@/components/CookieConsentBanner'
import { PWAProvider } from '@/components/ui/PWAProvider'
import ThemeScript from '@/components/layout/ThemeScript'
import WelcomeGate from '@/components/pwa/WelcomeGate'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'Paporla - Rescate Alimentario',
    template: '%s | Paporla',
  },
  description: 'Rescatamos comida en buen estado de comercios locales para tu mesa. Menos desperdicio, más comunidad.',
  keywords: [
    'rescate alimentario',
    'comida',
    'desperdicio',
    'packs sorpresa',
    'excedentes',
    'alimentación',
    'Latinoamérica',
  ],
  authors: [{ name: 'Paporla', url: 'https://paporla.com' }],
  creator: 'Paporla',
  publisher: 'Paporla',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://paporla.com'),
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    url: '/',
    siteName: 'Paporla',
    title: 'Paporla - Rescate Alimentario',
    description:
      'Rescatamos comida en buen estado de comercios locales para tu mesa. Menos desperdicio, más comunidad.',
    images: [
      {
        // Paso 43: PNG real de 1200x630; WhatsApp, Telegram y Twitter no
        // pintan SVG, que es lo que había antes y por eso los links
        // compartidos salían sin imagen.
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Paporla - Rescate Alimentario',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Paporla - Rescate Alimentario',
    description: 'Rescatamos comida en buen estado de comercios locales para tu mesa.',
    images: ['/og-image.png'],
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
    icon: [
      { url: '/favicon/favicon.ico', sizes: 'any' },
      { url: '/favicon/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon/favicon-96x96.png?v=2', sizes: '96x96', type: 'image/png' },
      { url: '/favicon/icon-192.png?v=2', sizes: '192x192', type: 'image/png' },
      { url: '/favicon/icon-512.png?v=2', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/favicon/apple-touch-icon.png',
  },
  manifest: '/favicon/site.webmanifest?v=2',
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Obtener nonce generado por middleware.ts para inline scripts
  const headersList = await headers()
  const nonce = headersList.get('x-nonce') ?? ''

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <ThemeScript nonce={nonce} />
        <script
          nonce={nonce}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'Paporla',
              description: 'Rescate Alimentario - Comida en buen estado de comercios locales para tu mesa.',
              url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://paporla.com',
              logo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://paporla.com'}/favicon/icon-512.png?v=2`,
              sameAs: ['https://instagram.com/paporla'],
              address: { '@type': 'PostalAddress', addressLocality: '', addressCountry: '' },
            }),
          }}
        />
      </head>
      <body className={inter.className}>
        <WelcomeGate />
        <GoogleTagManager nonce={nonce} />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-lg"
        >
          Saltar al contenido principal
        </a>
        <Providers nonce={nonce}>
          <RouteLoader />
          <PWAProvider />
          {children}
          <GoogleAnalytics />
          <CookieConsentBanner />
        </Providers>
      </body>
    </html>
  )
}
