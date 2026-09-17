import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

/**
 * A-12: el contraste se comprueba, no se supone.
 *
 * El propio `globals.css` afirmaba en un comentario que el primario era
 * "AA sobre crema" y NO lo era (3.29:1 cuando AA exige 4.5:1). Los
 * comentarios envejecen; este test lee los valores REALES del CSS y recalcula
 * el ratio con la fórmula WCAG, así que si alguien vuelve a subir un color
 * que no llega, aquí salta.
 *
 * No es un test de componentes: es un test de la paleta. Si cambias un
 * color de marca a propósito, este test te dice qué estás rompiendo.
 */

const CSS = readFileSync(path.join(process.cwd(), 'src/app/globals.css'), 'utf-8')

/** Quita los comentarios: dentro de ellos se mencionan valores antiguos. */
function sinComentarios(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

/** Extrae las variables de un bloque (`:root` o `.dark`) del CSS. */
function variablesDe(selector: ':root' | '.dark'): Record<string, string> {
  const limpio = sinComentarios(CSS)
  const ini = limpio.indexOf(`\n${selector} {`)
  if (ini === -1) throw new Error(`No encuentro el bloque ${selector} en globals.css`)
  const fin = limpio.indexOf('\n}', ini)
  const bloque = limpio.slice(ini, fin)

  const vars: Record<string, string> = {}
  for (const m of bloque.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
    vars[m[1]] = m[2].trim()
  }
  return vars
}

/** Componente linealizado de un canal sRGB (fórmula WCAG 2.1). */
function canalLineal(v: number): number {
  const c = v / 255
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

/** Luminancia relativa de un #rrggbb (o #rgb). */
function luminancia(hex: string): number {
  let h = hex.replace('#', '').trim()
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return 0.2126 * canalLineal(r) + 0.7152 * canalLineal(g) + 0.0722 * canalLineal(b)
}

/** Ratio de contraste WCAG entre dos colores (de 1 a 21). */
export function contraste(a: string, b: string): number {
  const la = luminancia(a)
  const lb = luminancia(b)
  const alto = Math.max(la, lb)
  const bajo = Math.min(la, lb)
  return (alto + 0.05) / (bajo + 0.05)
}

const CLARO = variablesDe(':root')
const OSCURO = variablesDe('.dark')

/** AA para texto normal: 4.5:1. */
const AA = 4.5

describe('contraste WCAG AA — modo claro', () => {
  const fondo = CLARO['--color-bg']
  const tarjeta = CLARO['--color-bg-card']

  it('el comentario que decía "AA sobre crema" ahora es cierto', () => {
    expect(contraste(CLARO['--color-primary'], fondo)).toBeGreaterThanOrEqual(AA)
  })

  it('el primario se lee también sobre el blanco de las tarjetas', () => {
    expect(contraste(CLARO['--color-primary'], tarjeta)).toBeGreaterThanOrEqual(AA)
  })

  it('toda la paleta de texto llega a AA sobre el fondo', () => {
    for (const v of ['--color-text', '--color-text-secondary', '--color-text-muted']) {
      expect(contraste(CLARO[v], fondo), `${v} = ${CLARO[v]}`).toBeGreaterThanOrEqual(AA)
    }
  })

  it('los colores de acento llegan a AA como texto', () => {
    for (const v of [
      '--color-primary',
      '--color-primary-dark',
      '--color-secondary',
      '--color-secondary-dark',
      '--color-danger',
    ]) {
      expect(contraste(CLARO[v], fondo), `${v} = ${CLARO[v]}`).toBeGreaterThanOrEqual(AA)
    }
  })

  /**
   * El caso que nadie miraba: el texto VA ENCIMA del botón. Ningún verde
   * cumple a la vez con texto blanco y con texto negro, así que hay un token
   * propio (--color-on-primary) y este test es el que lo sostiene.
   */
  it('el texto sobre el botón primario llega a AA', () => {
    expect(contraste(CLARO['--color-on-primary'], CLARO['--color-primary'])).toBeGreaterThanOrEqual(AA)
  })
})

describe('contraste WCAG AA — modo oscuro', () => {
  const fondo = OSCURO['--color-bg']

  it('el primario neon sigue cumpliendo', () => {
    expect(contraste(OSCURO['--color-primary'], fondo)).toBeGreaterThanOrEqual(AA)
  })

  it('la paleta de texto oscura cumple', () => {
    for (const v of ['--color-text', '--color-text-secondary', '--color-text-muted']) {
      expect(contraste(OSCURO[v], fondo), `${v} = ${OSCURO[v]}`).toBeGreaterThanOrEqual(AA)
    }
  })

  it('los acentos oscuros cumplen', () => {
    for (const v of ['--color-secondary', '--color-secondary-light', '--color-secondary-dark', '--color-danger']) {
      expect(contraste(OSCURO[v], fondo), `${v} = ${OSCURO[v]}`).toBeGreaterThanOrEqual(AA)
    }
  })

  it('el texto sobre el botón primario neon cumple (casi negro, no blanco)', () => {
    expect(contraste(OSCURO['--color-on-primary'], OSCURO['--color-primary'])).toBeGreaterThanOrEqual(AA)
  })
})

describe('el naranja depende del tema (A-12)', () => {
  it('claro y oscuro usan naranjas DISTINTOS: ninguno sirve para los dos', () => {
    expect(CLARO['--color-secondary']).not.toBe(OSCURO['--color-secondary'])
  })

  it('cada tema tiene sus tres canales RGB declarados', () => {
    for (const v of ['--color-secondary-rgb', '--color-secondary-light-rgb', '--color-secondary-dark-rgb']) {
      expect(CLARO[v], `${v} en claro`).toMatch(/^\d+\s+\d+\s+\d+$/)
      expect(OSCURO[v], `${v} en oscuro`).toMatch(/^\d+\s+\d+\s+\d+$/)
    }
  })
})

/* ---------------------------------------------------------------------------
   A-12b: los acentos de color de Tailwind estan calibrados para fondo oscuro.
   En claro, green-400 da 1.64:1 y yellow-400 1.44:1: invisibles. Son 299 usos,
   asi que se recogen en una regla global de globals.css en vez de uno a uno.

   Este test lee esas reglas y comprueba que el color al que se remapea cada
   clase llega a AA. Si alguien toca un valor y lo aclara, aqui salta.
--------------------------------------------------------------------------- */

/** Compone un color con alfa sobre un fondo conocido (para los rgb(... / 0.9)). */
function sobreFondo(color: string, fondo: string): string {
  const m = color.match(/rgba?\(\s*(\d+)\s+(\d+)\s+(\d+)(?:\s*\/\s*([\d.]+))?\s*\)/)
  if (!m) return color
  const alfa = m[4] === undefined ? 1 : Number(m[4])
  const base = fondo
    .replace('#', '')
    .match(/../g)!
    .map((h) => parseInt(h, 16))
  const capa = [1, 2, 3].map((i) => Number(m[i]))
  const mezcla = capa.map((c, i) => Math.round(c * alfa + base[i] * (1 - alfa)))
  return `#${  mezcla.map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

describe('acentos de color en modo claro (A-12b)', () => {
  const limpio = sinComentarios(CSS)

  /**
   * Extrae las reglas `html:not(.dark) .clase { propiedad: valor; }`.
   * Cada selector de la lista trae su propio prefijo, y ese prefijo contiene
   * un `.dark` que no es clase nuestra: se quita antes de extraer.
   */
  const reglas = [
    ...limpio.matchAll(
      /html:not\(\.dark\)((?:\s*(?:html:not\(\.dark\)\s*)?\.[-a-z0-9\\/]+\s*,?\s*)+)\{\s*(color|fill|background-color):\s*([^;]+);/gi,
    ),
  ].map((m) => ({
    clases: [...m[1].replace(/html:not\(\.dark\)/gi, '').matchAll(/\.([-a-z0-9\\/]+)/gi)].map((c) => c[1]),
    propiedad: m[2],
    valor: m[3].trim(),
  }))

  it('la regla existe y cubre las seis familias', () => {
    expect(reglas.length).toBeGreaterThan(0)
    const todas = reglas.flatMap((r) => r.clases).join(' ')
    for (const familia of ['red', 'green', 'amber', 'blue', 'yellow', 'orange']) {
      expect(todas, `familia ${familia}`).toContain(`text-${familia}-400`)
    }
  })

  it('cada color de TEXTO remapeado llega a AA sobre crema y sobre tarjeta', () => {
    const textos = reglas.filter((r) => r.propiedad === 'color')
    expect(textos.length).toBeGreaterThanOrEqual(6)
    for (const r of textos) {
      for (const fondo of [CLARO['--color-bg'], CLARO['--color-bg-card']]) {
        const ratio = contraste(sobreFondo(r.valor, fondo), fondo)
        expect(ratio, `${r.clases.join(',')} = ${r.valor} sobre ${fondo}`).toBeGreaterThanOrEqual(AA)
      }
    }
  })

  it('los rellenos de icono llegan a AA (WCAG 1.4.11 pide 3:1; damos mas)', () => {
    const rellenos = reglas.filter((r) => r.propiedad === 'fill')
    expect(rellenos.length).toBeGreaterThanOrEqual(2)
    for (const r of rellenos) {
      const ratio = contraste(sobreFondo(r.valor, CLARO['--color-bg-card']), CLARO['--color-bg-card'])
      expect(ratio, `${r.clases.join(',')} = ${r.valor}`).toBeGreaterThanOrEqual(AA)
    }
  })

  it('los fondos solidos admiten texto blanco encima', () => {
    const fondos = reglas.filter((r) => r.propiedad === 'background-color')
    expect(fondos.length).toBeGreaterThanOrEqual(3)
    for (const r of fondos) {
      const ratio = contraste('#ffffff', sobreFondo(r.valor, CLARO['--color-bg-card']))
      expect(ratio, `blanco sobre ${r.clases.join(',')} = ${r.valor}`).toBeGreaterThanOrEqual(AA)
    }
  })

  it('la regla NO toca los tintes (bg-red-500/10 y compania)', () => {
    // Si alguien remapeara .bg-red-500\/10, cambiarian de color decenas de chips.
    const todas = reglas.flatMap((r) => r.clases).join(' ')
    expect(todas).not.toContain('bg-red-500\\/10')
    expect(todas).not.toContain('bg-green-500\\/10')
  })

  it('la regla solo aplica en claro: ninguna lleva prefijo .dark', () => {
    for (const r of reglas) {
      for (const c of r.clases) {
        expect(c.startsWith('dark'), `clase ${c}`).toBe(false)
      }
    }
  })
})
