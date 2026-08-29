import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

/**
 * F8.5 (S2): un loading.tsx crea un boundary <Suspense> que streamea su
 * skeleton ANTES de que notFound() se ejecute en una pagina dinamica, y el
 * status HTTP queda fijado en 200 (Next.js devuelve 200 para respuestas
 * streameadas y 404 solo para las que no lo estan). Con los boundaries del
 * root y de
 * (public), /packs/<uuid-inexistente> respondia 200: Google podia indexar
 * packs que no existen.
 *
 * Solución: sin loading.tsx en el root ni en (public). Los grupos protegidos
 * (admin/auth/business/dashboard) conservan el suyo: sus rutas estan tras
 * login, sin impacto SEO.
 */
describe('sin boundaries de streaming sobre la seccion publica (f8.5 S2)', () => {
  it('no existe app/loading.tsx (el boundary raiz streamea antes de notFound)', () => {
    expect(existsSync(join(process.cwd(), 'src/app/loading.tsx'))).toBe(false)
  })

  it('no existe app/(public)/loading.tsx (mismo efecto sobre /packs y /shops)', () => {
    expect(existsSync(join(process.cwd(), 'src/app/(public)/loading.tsx'))).toBe(false)
  })

  it('los grupos protegidos conservan su loading.tsx (UX, sin impacto SEO)', () => {
    expect(existsSync(join(process.cwd(), 'src/app/(dashboard)/loading.tsx'))).toBe(true)
    expect(existsSync(join(process.cwd(), 'src/app/(auth)/loading.tsx'))).toBe(true)
    expect(existsSync(join(process.cwd(), 'src/app/(admin)/loading.tsx'))).toBe(true)
  })
})
