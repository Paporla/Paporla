import { describe, it, expect } from 'vitest'
import { parseShopStatus, canSubmitForReview, getMissingRequiredFields, REQUIRED_FIELDS } from '@/lib/utils/shopReview'

/**
 * Estos tests protegen el contrato con la RPC `submit_own_shop_for_review`
 * (supabase/migrations/0009_functions.sql:1343). Si alguien cambia la lista de
 * campos obligatorios en la base de datos y no aquí, el botón se activaría con
 * el perfil incompleto y el comercio recibiría un error sin explicación.
 */

/** Perfil con los 7 campos obligatorios rellenos. */
const completo = {
  name: 'Panadería Central',
  category: 'bakery',
  phone: '+56912345678',
  address: 'Av. Providencia 1234',
  taxId: '76543210-3',
  sanitaryResolution: 'RS N° 12345/2026 SEREMI RM',
  latitude: '-33.4372',
  longitude: '-70.6506',
  logoUrl: 'shop-id/logo.jpg',
  // Campos no obligatorios para la RPC: deben poder faltar sin bloquear.
  description: '',
  coverUrl: '',
  website: '',
  instagram: '',
}

describe('parseShopStatus', () => {
  it('acepta los seis estados canónicos de la tabla shops', () => {
    const estados = ['draft', 'pending_review', 'verified', 'rejected', 'suspended', 'closed']
    estados.forEach((estado) => {
      expect(parseShopStatus(estado)).toBe(estado)
    })
  })

  it('cae en draft ante un valor desconocido, null o no-string', () => {
    expect(parseShopStatus('banned')).toBe('draft')
    expect(parseShopStatus(null)).toBe('draft')
    expect(parseShopStatus(undefined)).toBe('draft')
    expect(parseShopStatus(42)).toBe('draft')
    expect(parseShopStatus({})).toBe('draft')
  })

  it('no confunde el estado vacío con verified', () => {
    expect(parseShopStatus('')).toBe('draft')
    expect(parseShopStatus('')).not.toBe('verified')
  })
})

describe('canSubmitForReview', () => {
  // La RPC: IF NOT FOUND OR v_shop.status NOT IN ('draft', 'rejected')
  it('permite enviar desde draft y desde rejected', () => {
    expect(canSubmitForReview('draft')).toBe(true)
    expect(canSubmitForReview('rejected')).toBe(true)
  })

  it('bloquea los estados que la RPC rechaza con SHOP_NOT_SUBMITTABLE', () => {
    expect(canSubmitForReview('pending_review')).toBe(false)
    expect(canSubmitForReview('verified')).toBe(false)
    expect(canSubmitForReview('suspended')).toBe(false)
    expect(canSubmitForReview('closed')).toBe(false)
  })
})

describe('getMissingRequiredFields', () => {
  it('no reporta nada cuando el perfil está completo', () => {
    expect(getMissingRequiredFields(completo)).toEqual([])
  })

  it('detecta cada campo obligatorio por separado', () => {
    REQUIRED_FIELDS.forEach(({ key, label }) => {
      const parcial = { ...completo, [key]: '' }
      const faltan = getMissingRequiredFields(parcial)
      expect(faltan).toHaveLength(1)
      expect(faltan[0].label).toBe(label)
    })
  })

  it('trata null y undefined como campos vacíos', () => {
    expect(getMissingRequiredFields({ ...completo, phone: null })).toHaveLength(1)
    expect(getMissingRequiredFields({ ...completo, logoUrl: undefined })).toHaveLength(1)
  })

  it('trata los espacios en blanco como vacío', () => {
    // Un nombre de solo espacios pasaría un `if (!value)` pero la RPC lo
    // guardaría como texto en blanco. Debe contar como que falta.
    const faltan = getMissingRequiredFields({ ...completo, name: '   ' })
    expect(faltan).toHaveLength(1)
    expect(faltan[0].label).toBe('Nombre del comercio')
  })

  it('NO exige description ni coverUrl, que la RPC no pide', () => {
    // Este es el error que evitamos: el completionPercentage de la pantalla sí
    // los mide, y usarlo habría bloqueado el botón sin motivo.
    const sinOpcionales = { ...completo, description: '', coverUrl: '', website: '', instagram: '' }
    expect(getMissingRequiredFields(sinOpcionales)).toEqual([])
  })

  it('SÍ exige latitud y longitud, que el completionPercentage ignora', () => {
    const sinCoords = { ...completo, latitude: '', longitude: '' }
    const labels = getMissingRequiredFields(sinCoords).map((f) => f.label)
    expect(labels).toContain('Latitud')
    expect(labels).toContain('Longitud')
  })

  it('acumula todos los campos que faltan, no solo el primero', () => {
    const vacio = {}
    expect(getMissingRequiredFields(vacio)).toHaveLength(REQUIRED_FIELDS.length)
  })

  it('devuelve la pestaña donde se corrige cada campo', () => {
    const faltan = getMissingRequiredFields({})
    const porEtiqueta = Object.fromEntries(faltan.map((f) => [f.label, f.tab]))
    expect(porEtiqueta['Teléfono']).toBe('info')
    expect(porEtiqueta['Latitud']).toBe('location')
    expect(porEtiqueta['Logo']).toBe('images')
  })

  it('acepta el 0 como coordenada válida y no lo cuenta como vacío', () => {
    // El ecuador y el meridiano de Greenwich son coordenadas legítimas. Un
    // `if (!value)` las tomaría por vacías.
    const faltan = getMissingRequiredFields({ ...completo, latitude: '0', longitude: '0' })
    expect(faltan).toEqual([])
  })
})
