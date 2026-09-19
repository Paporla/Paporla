'use client'

import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'
import { DEFAULT_MARKET } from '@/lib/constants/markets'

/**
 * Consentimiento del consumidor (paso 45).
 *
 * Lee los documentos legales publicados para el mercado (terminos y
 * privacidad del consumidor) y ofrece el almacen de cola: al registrarse no
 * hay sesion todavia (el correo se confirma despues), asi que la aceptacion
 * se encola en sessionStorage y PendingConsentRecorder la escribe en la base
 * con accept_legal_document en cuanto existe usuario autenticado. Eso deja
 * la prueba exigida por la Ley 21.719: quien, que version, cuando, desde donde.
 */

export interface ConsumerLegalDoc {
  legal_document_id: string
  document_type: string
  version: string
  content_url: string
  content_sha256: string
  is_required: boolean
}

const TIPOS_CONSUMIDOR = ['terms', 'privacy']
const CLAVE_PENDIENTE = 'paporla:consent-pending:v1'

export const DOC_LABELS: Record<string, string> = {
  terms: 'los Términos y Condiciones',
  privacy: 'la Política de Privacidad',
}

export function useConsumerLegalConsent() {
  const [loading, setLoading] = useState(true)
  const [docs, setDocs] = useState<ConsumerLegalDoc[]>([])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const { data, error } = await supabaseBrowser().rpc('list_current_legal_documents', {
        p_market_id: DEFAULT_MARKET.id,
        p_language: 'es',
      })
      if (cancelled) return
      if (!error && data) {
        setDocs((data as ConsumerLegalDoc[]).filter((d) => TIPOS_CONSUMIDOR.includes(d.document_type) && d.is_required))
      }
      // Sin documentos publicados no se exige nada nuevo: el checkbox estatico
      // del formulario sigue cubriendo el aviso, y la base sigue siendo la guarda.
      setLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return { loading, docs }
}

export interface PendingConsent {
  at: string
  docs: ConsumerLegalDoc[]
}

export function queuePendingConsent(docs: ConsumerLegalDoc[]) {
  if (docs.length === 0) return
  try {
    sessionStorage.setItem(CLAVE_PENDIENTE, JSON.stringify({ at: new Date().toISOString(), docs }))
  } catch {
    /* navegacion privada sin storage: sin cola no hay registro, y el aviso
       del checkbox igualmente quedo mostrado al usuario */
  }
}

export function takePendingConsent(): PendingConsent | null {
  try {
    const raw = sessionStorage.getItem(CLAVE_PENDIENTE)
    return raw ? (JSON.parse(raw) as PendingConsent) : null
  } catch {
    return null
  }
}

export function clearPendingConsent() {
  try {
    sessionStorage.removeItem(CLAVE_PENDIENTE)
  } catch {
    /* nada que hecho */
  }
}
