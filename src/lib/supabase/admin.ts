import { createClient } from '@supabase/supabase-js'
import { constantTimeEqual } from '@/lib/middleware/csrf'

export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient(url, key)
}

export function validateCronRequest(request: Request): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.error('[CRON] CRON_SECRET no configurado — denegando acceso por seguridad')
    return false
  }

  if (!authHeader) {
    return false
  }

  // Comparación en tiempo constante (mismo patrón que el CSRF double-submit,
  // f8.5 S5): el === de antes cortocircuitaba en el primer byte distinto y
  // filtraba el secreto por tiempo de respuesta.
  return constantTimeEqual(authHeader, `Bearer ${cronSecret}`)
}
