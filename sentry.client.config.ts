import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
const isProduction = process.env.NODE_ENV === 'production'

if (dsn && isProduction) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    environment: 'production',
    beforeSend(event) {
      if (event.exception) {
        console.error('[Sentry]', event.exception.values?.[0]?.value)
      }
      return event
    },
  })
}
