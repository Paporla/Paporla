// @ts-nocheck
// ============================================
// SUPABASE EDGE FUNCTION
// Limpieza de reservas pendientes vencidas
// ============================================
//
// CÓMO DESPLEGAR:
// supabase functions deploy cleanup-reservations --no-verify-jwt
//
// CÓMO CONFIGURAR CRON-JOB.ORG:
// URL: https://tu-proyecto.supabase.co/functions/v1/cleanup-reservations
// Method: GET
// Schedule: */5 * * * *
// Headers: Authorization: Bearer TU_CLAVE_SECRETA
// ============================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    // 1. Verificar autorización (evita que cualquiera ejecute esta función)
    const authHeader = req.headers.get('Authorization')
    const cronJobSecret = Deno.env.get('CRON_JOB_SECRET')

    if (cronJobSecret && authHeader !== `Bearer ${cronJobSecret}`) {
      console.log('❌ Acceso no autorizado')
      return new Response(JSON.stringify({ success: false, error: 'No autorizado' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    // 2. Crear cliente de Supabase con permisos de administrador
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // 3. Ejecutar la función SQL que limpia reservas pendientes
    const { data, error } = await supabase.rpc('cleanup_pending_reservations')

    if (error) {
      console.error('❌ Error al ejecutar cleanup_pending_reservations:', error)
      throw error
    }

    const expiredCount = data || 0

    console.log(`✅ ${expiredCount} reservas pendientes canceladas por timeout`)

    // 4. Responder con éxito
    return new Response(
      JSON.stringify({
        success: true,
        expired: expiredCount,
        message: `${expiredCount} reservas pendientes canceladas y stock reintegrado`,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('❌ Error general en cleanup-reservations:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
