'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useAuth } from './useAuth';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export interface Notification {
  id: string;
  user_id: string;
  reservation_id: string | null;
  type: 'pickup_reminder' | 'cancellation' | 'confirmation' | 'new_pack' | 'shop_verified'
    | 'new_reservation' | 'user_cancelled' | 'pickup_completed' | 'new_user' | 'new_shop' | 'incidence';
  message: string;
  is_read: boolean;
  sent_at: string | null;
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const supabase = supabaseBrowser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const loadNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    }
    setLoading(false);
  }, [user, supabase]);

  // Cargar al inicio
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // ============================================
  // SUPABASE REALTIME — Escuchar notificaciones
  // ============================================
  useEffect(() => {
    if (!user) return;

    // Limpiar canal anterior si existe
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    // Suscribirse a nuevos inserts en notifications para este usuario
    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: RealtimePostgresChangesPayload<Notification>) => {
          const newNotif = payload.new as Notification
          if (newNotif) {
            setNotifications(prev => [newNotif, ...prev])
            setUnreadCount(prev => prev + 1)
          }
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [user, supabase])

  const markAsRead = useCallback(async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (!error) {
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  }, [supabase]);

  const markAllAsRead = useCallback(async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', unreadIds);

    if (!error) {
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);
    }
  }, [notifications, supabase]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (!error) {
      const deleted = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      if (deleted && !deleted.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    }
  }, [notifications, supabase]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    reload: loadNotifications,
  };
}