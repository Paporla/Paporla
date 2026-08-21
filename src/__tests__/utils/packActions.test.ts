import { describe, it, expect } from 'vitest'
import { getPackAction, getPackActionDisabledReason, getPackStatusLabel } from '@/lib/utils/packActions'

describe('getPackAction', () => {
  it('un borrador se publica con publish_pack, no con set_pack_paused', () => {
    const action = getPackAction('draft')
    expect(action.kind).toBe('publish')
    expect(action.rpc).toBe('publish_pack')
    expect(action.args).toEqual({})
  })

  it('un pack activo se pausa', () => {
    const action = getPackAction('active')
    expect(action.kind).toBe('pause')
    expect(action.rpc).toBe('set_pack_paused')
    expect(action.args).toEqual({ p_paused: true })
    expect(action.isWithdrawing).toBe(true)
  })

  it('un pack pausado se reanuda con set_pack_paused(false)', () => {
    const action = getPackAction('paused')
    expect(action.kind).toBe('resume')
    expect(action.rpc).toBe('set_pack_paused')
    expect(action.args).toEqual({ p_paused: false })
  })

  it('ningún botón se etiqueta como eliminar o borrar', () => {
    for (const status of ['draft', 'active', 'paused']) {
      expect(getPackAction(status).label.toLowerCase()).not.toMatch(/elimin|borrar|quitar/)
    }
  })

  it('ningún mensaje afirma que se ha eliminado algo', () => {
    // Se permite negarlo explícitamente ("no se ha borrado"), que es
    // justamente la tranquilidad que necesita el comercio al pausar.
    for (const status of ['draft', 'active', 'paused']) {
      const msg = getPackAction(status).successMessage.toLowerCase()
      expect(msg).not.toMatch(/(?<!no se ha )eliminad/)
      expect(msg).not.toMatch(/(?<!no se ha )borrad/)
    }
  })

  it('los estados terminales no ofrecen acción y explican por qué', () => {
    for (const status of ['sold_out', 'expired', 'archived']) {
      expect(getPackAction(status).rpc).toBeNull()
      expect(getPackActionDisabledReason(status)).toBeTruthy()
    }
  })

  it('un estado desconocido no rompe la interfaz', () => {
    expect(getPackAction('lo_que_sea').rpc).toBeNull()
    expect(getPackStatusLabel('lo_que_sea')).toBe('lo_que_sea')
  })
})

describe('getPackStatusLabel', () => {
  it('traduce todos los estados canónicos', () => {
    expect(getPackStatusLabel('draft')).toBe('Borrador')
    expect(getPackStatusLabel('active')).toBe('Activo')
    expect(getPackStatusLabel('paused')).toBe('Pausado')
    expect(getPackStatusLabel('sold_out')).toBe('Agotado')
    expect(getPackStatusLabel('expired')).toBe('Caducado')
    expect(getPackStatusLabel('archived')).toBe('Archivado')
  })
})
