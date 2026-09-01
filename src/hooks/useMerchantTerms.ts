'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'
import { DEFAULT_MARKET } from '@/lib/constants/markets'

/**
 * Términos y Condiciones para Comercios (documento `merchant_terms` de
 * `legal_documents`, publicado por 0040).
 *
 * El hook responde tres preguntas que necesita el perfil del comercio:
 *  1. ¿Hay un merchant_terms publicado para el mercado? (si no, no se exige)
 *  2. ¿Este usuario ya aceptó ESA versión? (si sí, no se vuelve a pedir)
 *  3. accept(): registra la aceptación vía `accept_legal_document`, que es
 *     idempotente (ON CONFLICT DO NOTHING) y guarda fecha, versión, plataforma
 *     y contexto — la prueba exacta que exige tener un registro de aceptación.
 *
 * La RPC `submit_own_shop_for_review` valida lo mismo en la base (0040):
 * este hook solo existe para que la UI pueda pedir la aceptación ANTES de
 * que la base responda con un MERCHANT_TERMS_NOT_ACCEPTED genérico.
 */

interface LegalDocumentRow {
  legal_document_id: string
  document_type: string
  version: string
  content_url: string
}

export interface MerchantTermsState {
  /** Cargando el documento y la aceptación previa. Mientras tanto no se exige nada. */
  loading: boolean
  /** id del merchant_terms publicado del mercado, o null si no existe. */
  documentId: string | null
  /** Versión publicada (p. ej. '2026-09-01'), para mostrarla si hace falta. */
  version: string | null
  /** El usuario ya aceptó la versión publicada. */
  accepted: boolean
  /** Registra la aceptación. Lanza si la RPC falla. */
  accept: () => Promise<void>
}

export function useMerchantTerms(): MerchantTermsState {
  const [loading, setLoading] = useState(true)
  const [documentId, setDocumentId] = useState<string | null>(null)
  const [version, setVersion] = useState<string | null>(null)
  const [accepted, setAccepted] = useState(false)

  useEffect(() => {
    let cancelled = false
    const supabase = supabaseBrowser()

    const load = async () => {
      // 1. ¿Hay merchant_terms publicado para el mercado?
      const { data, error } = await supabase.rpc('list_current_legal_documents', {
        p_market_id: DEFAULT_MARKET.id,
        p_language: 'es',
      })

      if (cancelled) return
      if (error || !data) {
        // Sin datos no se puede exigir nada: la base sigue siendo la guarda
        // final (la RPC de envío valida la aceptación de todos modos).
        setLoading(false)
        return
      }

      const doc = (data as LegalDocumentRow[]).find((d) => d.document_type === 'merchant_terms') ?? null
      if (!doc) {
        setLoading(false)
        return
      }

      setDocumentId(doc.legal_document_id)
      setVersion(doc.version)

      // 2. ¿Ya la aceptó? RLS solo deja leer las aceptaciones propias.
      const { data: acceptance } = await supabase
        .from('legal_acceptances')
        .select('legal_document_id')
        .eq('legal_document_id', doc.legal_document_id)
        .maybeSingle()

      if (cancelled) return
      setAccepted(Boolean(acceptance))
      setLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const accept = useCallback(async () => {
    if (!documentId) return
    const supabase = supabaseBrowser()
    const { error } = await supabase.rpc('accept_legal_document', {
      p_legal_document_id: documentId,
      p_app_platform: 'web',
      p_app_version: '',
      p_acceptance_context: 'merchant_onboarding',
    })
    if (error) throw error
    setAccepted(true)
  }, [documentId])

  return { loading, documentId, version, accepted, accept }
}
