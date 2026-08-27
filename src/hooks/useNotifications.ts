'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { translateDbError } from '@/lib/utils/db-errors'

/**
 * Fila canónica de `public.notifications` (0006_notifications_devices.sql).
 *
 * LA TABLA NO TIENE columnas `message` ni `is_read`: esa era la forma que
 * imaginaba una versión vieja de este hook (y de las rutas API muertas). El
 * texto vive en `title` + `body` y "no leída" = `read_at IS NULL`.
 *
 * El RLS (0011) solo concede SELECT sobre las filas del propio usuario, así
 * que la marca de leída se hace EXCLUSIVAMENTE con la RPC
 * `mark_notification_read` (0009, GRANT en 0012). No existe ningún camino
 * canónico de borrado (ni RPC ni policy DELETE): el inbox es un registro
 * persistente de actividad, no una papelera.
 */
export interface Notification {
  id: string
  user_id: string
  category: string
  type: string
  title: string
  body: string
  data: Record<string, unknown>
  reservation_id: string | null
  shop_id: string | null
  pack_id: string | null
  read_at: string | null
  expires_at: string | null
  created_at: string
}

/** "No leídas" derivado de la columna real: `read_at IS NULL`. */
export function countUnread(rows: ReadonlyArray<Pick<Notification, 'read_at'>>): number {
  return rows.reduce((acc, n) => acc + (n.read_at === null ? 1 : 0), 0)
}

export function useNotifications() {
  const { user } = useAuth()
  const supabase = supabaseBrowser()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Estado derivado, no un `unreadCount` aparte que mantener sincronizado
  // (antes se recalculaba dentro de otros updaters, que es un desfase
  // esperando a pasar).
  const unreadCount = countUnread(notifications)

  // Carga inicial. Todos los setStates ocurren DESPUÉS del primer `await`
  // (el efecto no provoca renders en cascada síncronos) y la bandera
  // `cancelled` invalida respuestas viejas si el usuario cambia a mitad.
  useEffect(() => {
    // No hacer nada hasta que tengamos el usuario. Si user es null porque
    // auth aun esta cargando, mantenemos loading=true (el estado inicial).
    if (!user) return
    let cancelled = false
    ;(async () => {
      // SELECT directo, que es lo que el RLS concede (el comentario de la
      // tabla lo dice: "Clients read their rows and use a dedicated RPC to
      // mark read").
      const { data, error: queryError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (cancelled) return
      if (queryError) {
        setError(translateDbError(queryError, 'No se pudieron cargar las notificaciones.'))
        setNotifications([])
      } else {
        setError(null)
        setNotifications((data ?? []) as Notification[])
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [user, supabase])

  // Suscripción a cambios en tiempo real de MIS filas (INSERT/UPDATE).
  // No hay handler de DELETE: el RLS no permite borrar notificaciones.
  useEffect(() => {
    const userId = user?.id ?? null
    if (!userId) return

    // Nombre único por montaje para evitar colisiones en React Strict Mode
    const channelName = `notifications-${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          const newNotification = payload.new as Notification
          setNotifications((prev) => [newNotification, ...prev])
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          const updated = payload.new as Notification
          setNotifications((prev) => prev.map((n) => (n.id === updated.id ? updated : n)))
        },
      )
      .subscribe()

    // Cleanup: eliminar canal al cambiar de usuario o desmontar
    return () => {
      supabase.removeChannel(channel).catch(() => {})
    }
  }, [user?.id, supabase])

  /**
   * Marca una notificación como leída vía la RPC canónica (0009:183).
   * Es idempotente en la base (COALESCE(read_at, now())).
   */
  const markAsRead = useCallback(
    async (notificationId: string) => {
      const { error: rpcError } = await supabase.rpc('mark_notification_read', {
        p_notification_id: notificationId,
      })
      if (rpcError) {
        setError(translateDbError(rpcError, 'No se pudo marcar la notificación como leída.'))
        return
      }
      const now = new Date().toISOString()
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId && n.read_at === null ? { ...n, read_at: now } : n)),
      )
    },
    [supabase],
  )

  /**
   * Marca como leídas todas las que lo estén. No hay RPC por lotes, así que
   * una llamada por no leída (con el volumen del piloto el inbox cabe en una
   * pantalla). Devuelve `true` solo si todas llegaron.
   */
  const markAllAsRead = useCallback(async (): Promise<boolean> => {
    const unread = notifications.filter((n) => n.read_at === null)
    if (unread.length === 0) return true

    const results = await Promise.all(
      unread.map((n) => supabase.rpc('mark_notification_read', { p_notification_id: n.id })),
    )
    const firstError = results.find((r) => r.error)?.error
    if (firstError) {
      setError(translateDbError(firstError, 'No se pudieron marcar las notificaciones como leídas.'))
      return false
    }
    const now = new Date().toISOString()
    setNotifications((prev) => prev.map((n) => (n.read_at === null ? { ...n, read_at: now } : n)))
    return true
  }, [notifications, supabase])

  return { notifications, unreadCount, markAsRead, markAllAsRead, loading, error }
}
