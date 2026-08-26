export const formatDate = (date: string | null): string => {
  if (!date) return 'Fecha no disponible'
  return new Date(date).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const formatRelativeDate = (date: string): string => {
  const now = new Date()
  const target = new Date(date)
  const diffHours = Math.floor((now.getTime() - target.getTime()) / (1000 * 60 * 60))

  if (diffHours < 1) return 'Hace menos de 1 hora'
  if (diffHours < 24) return diffHours === 1 ? 'Hace 1 hora' : `Hace ${diffHours} horas`
  if (diffHours < 48) return 'Ayer'
  return formatDate(date)
}

/**
 * Formatea la ventana de recogida de una reserva en la zona horaria del
 * mercado (la RPC list_shop_reservations la devuelve en `timezone`), no en
 * la del navegador: "dom, 30 sept., 15:00 – 18:00".
 */
export const formatPickupWindow = (
  startAt: string | null,
  endAt: string | null,
  timeZone: string = 'America/Santiago',
): string => {
  if (!startAt) return 'Fecha por confirmar'
  const start = new Date(startAt)
  if (Number.isNaN(start.getTime())) return 'Fecha por confirmar'

  const startText = start.toLocaleString('es-CL', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false, // formato 24h: es el estándar comercial en Chile
    timeZone,
  })

  if (!endAt) return startText
  const end = new Date(endAt)
  if (Number.isNaN(end.getTime())) return startText

  const endText = end.toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
  })
  return `${startText} – ${endText}`
}

/**
 * Devuelve el día (YYYY-MM-DD) en el que cae un instante, calculado en la
 * zona horaria indicada (no la del navegador ni la del servidor). Es la
 * base del contador "Hoy" del panel del comercio: una recogida de las 22:00
 * de Santiago ya es "hoy" aunque en UTC sea mañana (o al revés).
 */
export const dateKeyInTimezone = (iso: string | null, timeZone: string = 'America/Santiago'): string => {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone,
  }).format(date)
}
