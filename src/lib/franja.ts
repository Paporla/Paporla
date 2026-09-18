/**
 * Franjas del día para la pantalla de bienvenida de la app instalada.
 *
 * La hora se lee del reloj de Chile (America/Santiago), no del dispositivo:
 * un usuario viajando vería la franja correcta igual. Los textos son la voz
 * de la casa; si se cambian, cambiar también el test que los fija.
 */
export type Franja = 'manana' | 'tarde' | 'noche'

export const FRANJAS: Record<Franja, { chip: string; tagline: string }> = {
  manana: { chip: 'Mañana', tagline: 'Tu pack te espera esta mañana.' },
  tarde: { chip: 'Tarde', tagline: 'Tu pack te espera esta tarde.' },
  noche: { chip: 'Noche', tagline: 'Tu pack te espera esta noche.' },
}

/** Microcopy rotativo mientras carga. Rotación cada 2,5 s en el componente. */
export const MICROCOPY: string[] = [
  'Cargando cercanía...',
  'Guardando las sobras con cariño...',
  'Afilando el código de recogida...',
  'Espabilando a la bolsita...',
]

/** 5:00-12:59 mañana · 13:00-19:59 tarde · resto noche. */
export function franjaDesdeHora(hora: number): Franja {
  if (hora >= 5 && hora <= 12) return 'manana'
  if (hora >= 13 && hora <= 19) return 'tarde'
  return 'noche'
}

/** Hora actual en Chile (0-23), sin depender de la zona del dispositivo. */
export function horaEnChile(ahora: Date): number {
  const partes = new Intl.DateTimeFormat('es-CL', {
    timeZone: 'America/Santiago',
    hour: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(ahora)
  const hora = partes.find((p) => p.type === 'hour')?.value ?? '0'
  return Number.parseInt(hora, 10)
}

export function franjaActual(ahora: Date): Franja {
  return franjaDesdeHora(horaEnChile(ahora))
}
