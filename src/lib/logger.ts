// ============================================
// Logger estructurado para Paporla
// Reemplaza console.* dispersos con un logger unificado.
// En producción se integra con Sentry automáticamente.
// ============================================

const isDev = process.env.NODE_ENV === 'development'
const isTest = process.env.NODE_ENV === 'test'

type LogMeta = Record<string, unknown>

export const logger = {
  error: (context: string, error: unknown, meta?: LogMeta) => {
    if (isTest) return
    // Sentry captura automáticamente en producción vía ErrorBoundary e instrumentation
    console.error(`[${context}]`, error instanceof Error ? error.message : error, meta ? meta : '')
  },

  warn: (context: string, message: string, meta?: LogMeta) => {
    if (isTest) return
    if (isDev) console.warn(`[${context}]`, message, meta ? meta : '')
  },

  info: (context: string, message: string, meta?: LogMeta) => {
    if (isTest) return
    if (isDev) console.info(`[${context}]`, message, meta ? meta : '')
  },

  debug: (context: string, message: string, meta?: LogMeta) => {
    if (isTest) return
    if (isDev) console.debug(`[${context}]`, message, meta ? meta : '')
  },
}
