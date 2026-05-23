import { createBrowserClient } from '@supabase/ssr'

function getEnvVar(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Variable de entorno faltante: ${name}. Revisa tu archivo .env.local`)
  }
  return value
}

export const supabaseBrowser = () =>
  createBrowserClient(getEnvVar('NEXT_PUBLIC_SUPABASE_URL'), getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY'))
