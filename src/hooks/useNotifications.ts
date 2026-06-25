'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'
import { useAuth } from './useAuth'

export interface Notification {
  id: string
  user_id: string
  reservation_id: string | null
  type:
    | 'pickup_reminder'
    | 'cancellation'
    | 'confirmation'
    | 'new_pack'
    | 'shop_verified'
    | 'new_reservation'
    | 'user_cancelled'
    | 'pickup_completed'
    | 'new_user'
    | 'new_shop'
    | 'incidence'
  message: string
  is_read: boolean
  sent_at: string | null
  created_at: string
}

export function useNotifications() {
  const { user } = useAuth()
  const supabaseRef = useRef(supabaseBrowser())
  const channelRef = useRef<ReturnType<ReturnType<typeof supabaseBrowser>['channel']> | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isFirstLoad = useRef(true)

  const supabase = supabaseRef.current

  const loadNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([])
      setUnreadCount(0)
      setLoading(false)
      return
    }

    if (isFirstLoad.current) {
      setLoading(true)
    }

    setError(null)

    const { data, error: queryError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (queryError) {
      setError(queryError.message)
    } else {
      setNotifications(data ?? [])
      setUnreadCount(data?.filter((n) => !n.is_read).length ?? 0)
    }

    setLoading(false)
    isFirstLoad.current = false
  }, [user, supabase])

  // Carga inicial
  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  // Suscripción a cambios en tiempo real
  // Solo se suscribe UNA VEZ por ID de usuario. Usa refs para evitar doble suscripción.
  const subscribedUserIdRef = useRef<string | null>(null)

  useEffect(() => {
    const userId = user?.id ?? null

    // Sin usuario → no hacer nada
    if (!userId) return

    // Si ya estamos suscritos para este usuario → no re-suscribir
    if (subscribedUserIdRef.current === userId) return

    // Limpiar canal anterior si existe (cambio de usuario)
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current).catch(() => {})
      channelRef.current = null
    }

    subscribedUserIdRef.current = userId

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          const newNotification = payload.new as Notification
          setNotifications((prev) => [newNotification, ...prev])
          setUnreadCount((prev) => prev + 1)
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          const updated = payload.new as Notification
          setNotifications((prev) => {
            const updatedList = prev.map((n) => (n.id === updated.id ? updated : n))
            setUnreadCount(updatedList.filter((n) => !n.is_read).length)
            return updatedList
          })
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          const deletedId = payload.old.id as string
          setNotifications((prev) => {
            const wasUnread = prev.find((n) => n.id === deletedId)?.is_read === false
            if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1))
            return prev.filter((n) => n.id !== deletedId)
          })
        },
      )
      .subscribe((status) => {
        if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          subscribedUserIdRef.current = null
          channelRef.current = null
        }
      })

    channelRef.current = channel

    return () => {
      // Solo limpiar en unmount real (cuando el componente se desmonta)
      // No limpiar en re-renders porque usamos el guard subscribedUserIdRef
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // Limpiar canal al desmontar el componente
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current).catch(() => {})
        channelRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const markAsRead = useCallback(
    async (notificationId: string) => {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)

      if (!updateError) {
        setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n)))
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    },
    [supabase],
  )

  const markAllAsRead = useCallback(async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id)
    if (unreadIds.length === 0) return

    const { error: updateError } = await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds)

    if (!updateError) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
    }
  }, [notifications, supabase])

  const deleteNotification = useCallback(
    async (notificationId: string) => {
      const { error: deleteError } = await supabase.from('notifications').delete().eq('id', notificationId)

      if (!deleteError) {
        const deleted = notifications.find((n) => n.id === notificationId)
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
        if (deleted && !deleted.is_read) {
          setUnreadCount((prev) => Math.max(0, prev - 1))
        }
      }
    },
    [notifications, supabase],
  )

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    reload: loadNotifications,
  }
}
