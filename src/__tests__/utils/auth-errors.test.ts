import { describe, it, expect } from 'vitest'
import { translateAuthError } from '@/lib/utils/auth-errors'

/**
 * L-41: translateAuthError entendía solo cadenas e instancias de Error. Los
 * errores de Supabase y de algunas RPCs llegan como OBJETO PLANO
 * ({ message, status, ... }), y con ellos el usuario veía "[object Object]"
 * en pantalla. Estos tests amarran los cuatro formatos de entrada.
 */

describe('translateAuthError — nunca más "[object Object]" (L-41)', () => {
  it('instancia de Error: se traduce', () => {
    expect(translateAuthError(new Error('Invalid login credentials'))).toBe(
      'Correo o contraseña incorrectos. Verifica tus datos e intenta de nuevo.',
    )
  })

  it('cadena: se traduce', () => {
    expect(translateAuthError('Invalid login credentials')).toBe(
      'Correo o contraseña incorrectos. Verifica tus datos e intenta de nuevo.',
    )
  })

  it('OBJETO PLANO con message (el caso de Supabase): se traduce igual que el Error', () => {
    expect(translateAuthError({ message: 'Invalid login credentials', status: 400 })).toBe(
      'Correo o contraseña incorrectos. Verifica tus datos e intenta de nuevo.',
    )
    expect(translateAuthError({ message: 'Email rate limit exceeded' })).toBe(
      'Has solicitado demasiados correos. Espera unos minutos e intenta de nuevo.',
    )
  })

  it('OBJETO PLANO sin message: se serializa, no se convierte en "[object Object]"', () => {
    const salida = translateAuthError({ code: 'whatever' })
    expect(salida).not.toContain('[object Object]')
    expect(salida).toContain('whatever')
  })

  it('sin error: aviso genérico, no un undefined en pantalla', () => {
    expect(translateAuthError(null)).toBe('Error desconocido')
    expect(translateAuthError(undefined)).toBe('Error desconocido')
  })
})
