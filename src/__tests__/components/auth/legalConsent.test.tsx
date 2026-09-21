import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { renderHook } from '@testing-library/react'

const rpcMock = vi.fn()
vi.mock('@/lib/supabase/client', () => ({
  supabaseBrowser: () => ({ rpc: rpcMock }),
}))
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'usuario-1' } }),
}))

import RegisterFormFields from '@/components/auth/RegisterFormFields'
import PendingConsentRecorder from '@/components/auth/PendingConsentRecorder'
import {
  useConsumerLegalConsent,
  queuePendingConsent,
  takePendingConsent,
  clearPendingConsent,
} from '@/hooks/useConsumerLegalConsent'

const DOC = {
  legal_document_id: 'doc-1',
  document_type: 'terms',
  version: '2026-09-19',
  content_url: 'https://www.paporla.com/legal/terminos',
  content_sha256: 'sha',
  is_required: true,
}

const propsBase = {
  formData: {
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    role: 'user' as const,
    shopName: '',
  },
  onChange: () => {},
  agreedToTerms: false,
  onTermsChange: () => {},
  errors: {},
  onClearError: () => {},
  touched: {},
  onFieldBlur: () => {},
}

beforeEach(() => {
  rpcMock.mockReset()
  localStorage.clear()
})

describe('paso 45: consentimiento del consumidor', () => {
  it('el checkbox enlaza los documentos publicados cuando existen', async () => {
    render(
      <RegisterFormFields {...propsBase} legalDocs={[{ label: 'los Términos y Condiciones', url: DOC.content_url }]} />,
    )
    const link = await screen.findByRole('link', { name: /Términos y Condiciones/i })
    expect(link.getAttribute('href')).toBe(DOC.content_url)
  })

  it('el hook filtra los documentos requeridos del consumidor', async () => {
    rpcMock.mockResolvedValue({
      data: [
        DOC,
        { ...DOC, legal_document_id: 'doc-2', document_type: 'merchant_terms' },
        { ...DOC, legal_document_id: 'doc-3', is_required: false },
      ],
      error: null,
    })
    const { result } = renderHook(() => useConsumerLegalConsent())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.docs).toHaveLength(1)
    expect(result.current.docs[0].legal_document_id).toBe('doc-1')
  })

  it('la cola de aceptaciones sobrevive escritura y lectura', () => {
    queuePendingConsent([DOC])
    const pendiente = takePendingConsent()
    expect(pendiente?.docs[0].legal_document_id).toBe('doc-1')
    clearPendingConsent()
    expect(takePendingConsent()).toBeNull()
  })

  it('el recorder escribe las aceptaciones con sesion y vacia la cola', async () => {
    rpcMock.mockResolvedValue({ data: null, error: null })
    queuePendingConsent([DOC, { ...DOC, legal_document_id: 'doc-4', document_type: 'privacy' }])
    render(<PendingConsentRecorder />)
    await waitFor(() => expect(rpcMock).toHaveBeenCalledTimes(2))
    expect(rpcMock.mock.calls[0][0]).toBe('accept_legal_document')
    expect(rpcMock.mock.calls[0][1].p_acceptance_context).toBe('signup')
    await waitFor(() => expect(takePendingConsent()).toBeNull())
  })

  it('un cliente sin rpc no rompe el hook: degrada a sin documentos', async () => {
    rpcMock.mockImplementation(() => {
      throw new Error('rpc ausente')
    })
    const { result } = renderHook(() => useConsumerLegalConsent())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.docs).toHaveLength(0)
  })

  it('si una aceptacion falla, la cola se conserva para reintentar', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'no' } })
    queuePendingConsent([DOC])
    render(<PendingConsentRecorder />)
    await waitFor(() => expect(rpcMock).toHaveBeenCalledTimes(1))
    expect(takePendingConsent()).not.toBeNull()
  })
})
