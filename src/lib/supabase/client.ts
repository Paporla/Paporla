import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl)
  throw new Error('Variable de entorno faltante: NEXT_PUBLIC_SUPABASE_URL. Revisa tu archivo .env.local')
if (!supabaseAnonKey)
  throw new Error('Variable de entorno faltante: NEXT_PUBLIC_SUPABASE_ANON_KEY. Revisa tu archivo .env.local')

export const supabaseBrowser = () => createBrowserClient(supabaseUrl, supabaseAnonKey)
