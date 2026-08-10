/**
 * Traducción de errores de Supabase Auth a español.
 * Centralizado para mantener consistencia en toda la app.
 */
export function translateAuthError(error: unknown): string {
  if (!error) return 'Error desconocido'

  const message = typeof error === 'string' ? error
    : error instanceof Error ? error.message
    : String(error)

  const lower = message.toLowerCase()

  // Credenciales
  if (lower.includes('invalid login credentials') || lower.includes('invalid email or password')) {
    return 'Correo o contraseña incorrectos. Verifica tus datos e intenta de nuevo.'
  }
  if (lower.includes('invalid email')) {
    return 'El correo electrónico no es válido.'
  }
  if (lower.includes('password')) {
    return 'La contraseña no cumple con los requisitos mínimos (8 caracteres, una mayúscula, un número).'
  }

  // Registro
  if (lower.includes('already registered') || lower.includes('already exists') || lower.includes('duplicate')) {
    return 'Ya existe una cuenta con este correo electrónico. ¿Olvidaste tu contraseña?'
  }
  if (lower.includes('email not confirmed')) {
    return 'Debes confirmar tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada.'
  }
  if (lower.includes('email rate limit')) {
    return 'Has solicitado demasiados correos. Espera unos minutos e intenta de nuevo.'
  }

  // Sesión
  if (lower.includes('session') || lower.includes('expired')) {
    return 'Tu sesión ha expirado. Inicia sesión nuevamente.'
  }
  if (lower.includes('unauthorized') || lower.includes('not authorized')) {
    return 'No tienes permiso para realizar esta acción.'
  }

  // Rate limiting
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Demasiadas solicitudes. Espera unos segundos e intenta de nuevo.'
  }

  // Red / genérico
  if (lower.includes('network') || lower.includes('fetch') || lower.includes('timeout')) {
    return 'Error de conexión. Verifica tu internet e intenta de nuevo.'
  }

  // Fallback: mostrar mensaje original si no mapeamos
  return `Error inesperado: ${message}`
}
