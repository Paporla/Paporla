'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useAuth } from './useAuth';

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
  const isFirstLoad = useRef(true);

  const loadNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    if (isFirstLoad.current) {
      setLoading(true);
    }

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
    isFirstLoad.current = false;
  }, [user, supabase]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const newNotification = payload.new as Notification
          setNotifications(prev => [newNotification, ...prev])
          setUnreadCount(prev => prev + 1)
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const updated = payload.new as Notification
          setNotifications(prev => {
            const updatedList = prev.map(n => n.id === updated.id ? updated : n)
            setUnreadCount(updatedList.filter(n => !n.is_read).length)
            return updatedList
          })
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const deletedId = payload.old.id as string
          setNotifications(prev => {
            const wasUnread = prev.find(n => n.id === deletedId)?.is_read === false
            if (wasUnread) setUnreadCount(c => Math.max(0, c - 1))
            return prev.filter(n => n.id !== deletedId)
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

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
