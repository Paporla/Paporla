'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabaseBrowser } from '@/lib/supabase/client'
import { takePendingConsent, clearPendingConsent } from '@/hooks/useConsumerLegalConsent'

/**
 * Escribe en la base las aceptaciones encoladas al registrarse, en cuanto
 * existe usuario autenticado (el registro confirma por correo, asi que en el
 * momento del click no hay uid todavia). accept_legal_document es idempotente
 * (ON CONFLICT DO NOTHING): reintentar es gratis y seguro. Si una aceptacion
 * falla, la cola se conserva y se reintenta en el siguiente montaje.
 */
export default function PendingConsentRecorder() {
  const { user } = useAuth()
  const enCurso = useRef(false)

  useEffect(() => {
    if (!user || enCurso.current) return
    const pendiente = takePendingConsent()
    if (!pendiente) return
    enCurso.current = true

    const run = async () => {
      const supabase = supabaseBrowser()
      for (const doc of pendiente.docs) {
        const { error } = await supabase.rpc('accept_legal_document', {
          p_legal_document_id: doc.legal_document_id,
          p_app_platform: 'web',
          p_app_version: '',
          p_acceptance_context: 'consumer_registration',
        })
        if (error) return // se conserva la cola: se reintenta al montar otra vez
      }
      clearPendingConsent()
      enCurso.current = false
    }
    void run()
  }, [user])

  return null
}
