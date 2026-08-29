import { describe, it, expect } from 'vitest'
import { jsonLdToScriptContent } from '@/lib/utils/json-ld'

describe('jsonLdToScriptContent (f8.5, S3)', () => {
  it('un </script> en el titulo no puede cerrar el tag ni inyectar HTML', () => {
    const out = jsonLdToScriptContent({ name: '</script><script>alert(1)</script>' })
    expect(out).not.toContain('<')
    expect(out).not.toContain('</script>')
    expect(out).not.toContain('<script>alert(1)')
  })

  it('el JSON sigue siendo valido y el contenido es identico al parsearlo', () => {
    const payload = { name: 'Pack </b> "sorpresa"', offers: { price: '3990', currency: 'CLP' } }
    expect(JSON.parse(jsonLdToScriptContent(payload))).toEqual(payload)
  })

  it('sin caracteres peligrosos, la salida es el JSON normal', () => {
    const payload = { name: 'Pack Pan', offers: { price: '3990' } }
    expect(jsonLdToScriptContent(payload)).toBe(JSON.stringify(payload))
  })

  it('escapa todos los "<" del contenido (descripcion incluida)', () => {
    const out = jsonLdToScriptContent({ description: 'a < b < c' })
    expect(out).not.toContain('<')
    expect(JSON.parse(out)).toEqual({ description: 'a < b < c' })
  })
})
