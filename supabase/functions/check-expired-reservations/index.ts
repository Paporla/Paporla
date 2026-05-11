// @ts-nocheck
// ============================================
// SUPABASE EDGE FUNCTION
// Auto-expirado de reservas vencidas
// ============================================
// 
// CÓMO DESPLEGAR:
// 1. Instalar Supabase CLI: npm install -g supabase
// 2. supabase login
// 3. supabase functions deploy check-expired-reservations
// 4. Programar cron en Supabase Dashboard:
//    - Ir a Database > Triggers
//    - Crear cron job cada 5-10 min
//    - SELECT expire_reservations()
//
// O usar la API route de Next.js como alternativa
// ============================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Llamar a la función SQL que expira reservas
    const { data, error } = await supabase.rpc('expire_reservations')

    if (error) throw error

    const expiredCount = data || 0

    console.log(`✅ ${expiredCount} reservas expiradas correctamente`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        expired: expiredCount,
        message: `${expiredCount} reservas marcadas como no_show` 
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Error al expirar reservas:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
