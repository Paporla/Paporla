import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function getEnvVar(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Variable de entorno faltante: ${name}. Revisa tu archivo .env.local`)
  }
  return value
}

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(getEnvVar('NEXT_PUBLIC_SUPABASE_URL'), getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY'), {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: Record<string, unknown>) {
        try {
          cookieStore.set({ name, value, ...options })
        } catch {
          // Silently handled — middleware manages cookie lifecycle
        }
      },
      remove(name: string, options: Record<string, unknown>) {
        try {
          cookieStore.delete({ name, ...options })
        } catch {
          // Silently handled — middleware manages cookie lifecycle
        }
      },
    },
  })
}
