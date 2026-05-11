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
  if (diffHours < 24) return `Hace ${diffHours} horas`
  if (diffHours < 48) return 'Ayer'
  return formatDate(date)
}