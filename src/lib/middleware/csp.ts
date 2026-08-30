// ============================================
// CSP — Nonce-based (replaces static 'unsafe-inline')
// ============================================
//
// Vive en su propio módulo (no en middleware.ts) para poder probar la
// política sin levantar el middleware completo (f8.5).

export function generateNonce(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
}

export function buildCspHeader(nonce: string): string {
  return [
    "default-src 'self'",
    // *.supabase.co NO va en script-src (f8.5 S7): la SDK va bundled con el
    // bundle de Next y las redirecciones de auth son navegaciones de primer
    // nivel (window.location), no carga de scripts. Sigue permitida en
    // connect-src (fetch/PostgREST) e img-src (buckets públicos de storage).
    `script-src 'self' 'nonce-${nonce}' https://www.googletagmanager.com https://www.google-analytics.com`,
    `style-src 'self' 'nonce-${nonce}'`,
    // Atributos style="..." (React SSR + framer-motion en ~109 componentes):
    // sin esto la CSP los bloquea en la primera pintada (29 violaciones en
    // consola, 30-ago). Los atributos no ejecutan JS: riesgo aceptado. Los
    // <style>/<script> inline siguen exigiendo nonce.
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    // *.google-analytics.com con comodin: GA4 enruta los hits a endpoints
    // regionales (region1.google-analytics.com, etc.) que un dominio fijo
    // www. bloqueaba y perdia mediciones (detectado en consola, 30-ago).
    `connect-src 'self' https://*.supabase.co https://*.sentry.io https://*.google-analytics.com`,
    "frame-src 'self' https://www.googletagmanager.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
}
