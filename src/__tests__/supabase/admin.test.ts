import { describe, it, expect, vi, afterEach } from 'vitest'
import { validateCronRequest } from '@/lib/supabase/admin'

function reqWithAuth(auth: string | null): Request {
  const headers = new Headers()
  if (auth) headers.set('authorization', auth)
  return new Request('http://localhost/api/cron/cleanup-pending', { headers })
}

describe('validateCronRequest (f8.5 S5)', () => {
  const OLD_SECRET = process.env.CRON_SECRET

  afterEach(() => {
    if (OLD_SECRET === undefined) delete process.env.CRON_SECRET
    else process.env.CRON_SECRET = OLD_SECRET
    vi.restoreAllMocks()
  })

  it('acepta el Bearer exacto', () => {
    process.env.CRON_SECRET = 'sec-1234'
    expect(validateCronRequest(reqWithAuth('Bearer sec-1234'))).toBe(true)
  })

  it('rechaza un secreto distinto (aunque empiece igual)', () => {
    process.env.CRON_SECRET = 'sec-1234'
    expect(validateCronRequest(reqWithAuth('Bearer sec-1235'))).toBe(false)
    expect(validateCronRequest(reqWithAuth('Bearer sec-'))).toBe(false)
  })

  it('rechaza sin header de autorizacion', () => {
    process.env.CRON_SECRET = 'sec-1234'
    expect(validateCronRequest(reqWithAuth(null))).toBe(false)
  })

  it('rechaza sin CRON_SECRET (fail-closed)', () => {
    delete process.env.CRON_SECRET
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(validateCronRequest(reqWithAuth('Bearer sec-1234'))).toBe(false)
    expect(errSpy).toHaveBeenCalled()
  })
})
