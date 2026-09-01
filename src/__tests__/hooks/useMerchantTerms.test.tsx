import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useMerchantTerms } from '@/hooks/useMerchantTerms'
import { supabaseBrowser } from '@/lib/supabase/client'

vi.mock('@/lib/supabase/client', () => ({
  supabaseBrowser: vi.fn(),
}))

/** Fila como la devuelve list_current_legal_documents (0014). */
const merchantTermsDoc = {
  legal_document_id: 'doc-1',
  document_type: 'merchant_terms',
  language: 'es',
  version: '2026-09-01',
  content_url: 'https://paporla.com/legal/terminos-comercios',
  content_sha256: 'a'.repeat(64),
  effective_at: '2026-09-01T00:00:00Z',
  is_required: true,
}

let rpc: ReturnType<typeof vi.fn>

function setupMockClient({
  documents = [] as Record<string, unknown>[],
  documentsError = null as { message: string } | null,
  existingAcceptance = null as Record<string, unknown> | null,
  acceptError = null as { message: string } | null,
} = {}) {
  rpc = vi.fn().mockImplementation((name: string) => {
    if (name === 'list_current_legal_documents')
      return Promise.resolve({ data: documentsError ? null : documents, error: documentsError })
    if (name === 'accept_legal_document')
      return Promise.resolve({ data: acceptError ? null : { success: true }, error: acceptError })
    return Promise.resolve({ data: null, error: null })
  })

  const maybeSingle = vi.fn().mockResolvedValue({ data: existingAcceptance, error: null })
  const eq = vi.fn().mockReturnValue({ maybeSingle })
  const select = vi.fn().mockReturnValue({ eq })
  const from = vi.fn().mockReturnValue({ select })

  ;(supabaseBrowser as unknown as { mockReturnValue: (v: unknown) => void }).mockReturnValue({ rpc, from })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useMerchantTerms', () => {
  it('sin merchant_terms publicado: nada que exigir', async () => {
    setupMockClient({ documents: [] })
    const { result } = renderHook(() => useMerchantTerms())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.documentId).toBeNull()
    expect(result.current.accepted).toBe(false)
  })

  it('con documento publicado y sin aceptación previa: pendiente de aceptar', async () => {
    setupMockClient({ documents: [merchantTermsDoc] })
    const { result } = renderHook(() => useMerchantTerms())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.documentId).toBe('doc-1')
    expect(result.current.version).toBe('2026-09-01')
    expect(result.current.accepted).toBe(false)
  })

  it('con aceptación previa registrada: no se vuelve a pedir', async () => {
    setupMockClient({
      documents: [merchantTermsDoc],
      existingAcceptance: { legal_document_id: 'doc-1' },
    })
    const { result } = renderHook(() => useMerchantTerms())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.accepted).toBe(true)
  })

  it('accept() registra la aceptación con la RPC y marca accepted', async () => {
    setupMockClient({ documents: [merchantTermsDoc] })
    const { result } = renderHook(() => useMerchantTerms())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.accept()
    })

    expect(rpc).toHaveBeenCalledWith('accept_legal_document', {
      p_legal_document_id: 'doc-1',
      p_app_platform: 'web',
      p_app_version: '',
      p_acceptance_context: 'merchant_onboarding',
    })
    expect(result.current.accepted).toBe(true)
  })

  it('accept() propaga el error de la RPC y NO marca accepted', async () => {
    setupMockClient({ documents: [merchantTermsDoc], acceptError: { message: 'LEGAL_DOCUMENT_NOT_APPLICABLE' } })
    const { result } = renderHook(() => useMerchantTerms())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(
      act(async () => {
        await result.current.accept()
      }),
    ).rejects.toBeTruthy()
    expect(result.current.accepted).toBe(false)
  })

  it('si listar documentos falla, no bloquea al comercio (la base es la guarda final)', async () => {
    setupMockClient({ documentsError: { message: 'network' } })
    const { result } = renderHook(() => useMerchantTerms())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.documentId).toBeNull()
  })
})
