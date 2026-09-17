import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

/**
 * A-18 y A-17: el CI es codigo que se ejecuta con acceso a los secretos del
 * repositorio (claves de Supabase, Resend...). Por eso se vigila como codigo.
 *
 * A-18: una accion fijada por etiqueta movil (`actions/checkout@v4`) es un
 * puntero que el mantenedor puede mover. Si su cuenta se viera comprometida,
 * el CI ejecutaria codigo ajeno CON NUESTROS SECRETOS. Fijada por SHA no:
 * el SHA es inmutable.
 *
 * A-17: con `--audit-level=critical`, una vulnerabilidad "alta" se reportaba
 * y el CI seguia en verde. Estando a las puertas de cobrar, eso no vale.
 */

const DIR = path.join(process.cwd(), '.github', 'workflows')

function workflows(): { nombre: string; contenido: string }[] {
  return readdirSync(DIR)
    .filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))
    .map((nombre) => ({
      nombre,
      contenido: readFileSync(path.join(DIR, nombre), 'utf-8'),
    }))
}

/** Todas las acciones que usa un workflow: `uses: owner/repo@ref`. */
function acciones(yml: string): { repo: string; ref: string; linea: string }[] {
  return [...yml.matchAll(/^\s*(?:-\s+)?uses:\s*([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)@(\S+)/gm)].map((m) => ({
    repo: m[1],
    ref: m[2],
    linea: m[0].trim(),
  }))
}

describe('A-18: las acciones del CI van fijadas por huella (SHA)', () => {
  const sha40 = /^[0-9a-f]{40}$/

  it('hay workflows que comprobar', () => {
    expect(workflows().length).toBeGreaterThan(0)
  })

  it('ninguna accion se queda en etiqueta movil', () => {
    const sueltas: string[] = []
    for (const w of workflows()) {
      for (const a of acciones(w.contenido)) {
        // Las acciones locales (./) y las de Docker no aplican.
        if (a.repo.startsWith('.')) continue
        if (!sha40.test(a.ref)) sueltas.push(`${w.nombre}: ${a.linea}`)
      }
    }
    expect(sueltas, `acciones sin fijar:\n${sueltas.join('\n')}`).toEqual([])
  })

  it('cada huella lleva al lado la version legible', () => {
    // Sin el comentario, dentro de seis meses nadie sabra que SHA es que.
    const sinComentario: string[] = []
    for (const w of workflows()) {
      for (const linea of w.contenido.split('\n')) {
        const m = linea.match(/uses:\s*[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+@([0-9a-f]{40})(\s*)(#.*)?$/)
        if (m && !m[3]) sinComentario.push(`${w.nombre}: ${linea.trim()}`)
      }
    }
    expect(sinComentario, `huellas sin comentario de version:\n${sinComentario.join('\n')}`).toEqual([])
  })
})

describe('A-17: la auditoria de dependencias frena en "alta"', () => {
  it('npm audit ya no se conforma con las criticas', () => {
    const ci = workflows().find((w) => w.nombre === 'ci.yml')
    expect(ci, 'no encuentro ci.yml').toBeDefined()
    expect(ci!.contenido).toContain('npm audit --audit-level=high')
    expect(ci!.contenido).not.toContain('--audit-level=critical')
  })
})
