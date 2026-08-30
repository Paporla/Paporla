// Inicialización de Sentry en el cliente (navegador).
// Next.js 16 usa este archivo (instrumentation-client.ts); el antiguo
// sentry.client.config.ts era la convención legacy y fue eliminado.
// El DSN sale de la variable de entorno (Vercel: Production apunta al
// proyecto Sentry viejo, Preview al de staging). Sin DSN o fuera de
// production build, Sentry queda desactivado (dev local limpio).

import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
const isProduction = process.env.NODE_ENV === 'production'

if (dsn && isProduction) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    enableLogs: true,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? 'production',
  })
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
