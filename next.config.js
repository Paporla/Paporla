/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self)',
          },
          // CSP: Ahora manejado dinámicamente en middleware.ts con nonces
          // Se eliminó el CSP estático con 'unsafe-inline' (vulnerable a XSS)
          // Ver middleware.ts → buildCspHeader() para la política actual
        ],
      },
    ]
  },
}

const { withSentryConfig } = require('@sentry/nextjs')

const sentryOptions = {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: '/monitoring',
  hideSourceMaps: true,
}

// Solo activar monitoreo en producción cuando Sentry está configurado.
// En CI de PRs y Vercel deploy sin Sentry, se omite para no bloquear el build.
const hasSentryConfig = Boolean(
  process.env.SENTRY_ORG &&
  process.env.SENTRY_PROJECT &&
  process.env.SENTRY_ORG !== 'paporla' && // placeholder, no configurado real
  process.env.SENTRY_PROJECT !== 'paporla',
)

if (process.env.NODE_ENV === 'production' && hasSentryConfig) {
  module.exports = withSentryConfig(nextConfig, sentryOptions)
} else {
  module.exports = nextConfig
}
