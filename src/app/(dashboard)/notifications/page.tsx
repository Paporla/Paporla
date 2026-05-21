'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, CheckCheck, Trash2, Clock, Package, CheckCircle, XCircle, AlertCircle, Store, Heart } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabaseBrowser } from '@/lib/supabase/client';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Toast from '@/components/ui/Toast';

const iconMap: Record<string, { icon: any; color: string; bg: string }> = {
  pickup_reminder: { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  cancellation: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
  confirmation: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10' },
  new_pack: { icon: Package, color: 'text-primary', bg: 'bg-primary/10' },
  new_reservation: { icon: Package, color: 'text-primary', bg: 'bg-primary/10' },
  pick_up: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10' },
  favorite: { icon: Heart, color: 'text-red-400', bg: 'bg-red-500/10' },
  shop_verified: { icon: Store, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  incidence: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
};

const defaultIcon = { icon: Bell, color: 'text-gray-400', bg: 'bg-gray-500/10' };

export default function NotificationsPage() {
  const { user } = useAuth();
  const supabase = supabaseBrowser();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      
      if (!user) {
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error) {
        setNotifications(data || []);
        setUnreadCount(data?.filter(n => !n.is_read).length || 0);
      }
      
      // Delay minimo de 300ms para que el spinner sea visible
      setTimeout(() => setLoading(false), 300);
    };
    
    load();
  }, [user, supabase]);

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
    setToast({ message: 'Todas marcadas como leidas', type: 'success' });
    setTimeout(() => setToast(null), 2000);
  };

  const deleteNotification = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id);
    const deleted = notifications.find(n => n.id === id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (deleted && !deleted.is_read) setUnreadCount(prev => Math.max(0, prev - 1));
    setToast({ message: 'Notificacion eliminada', type: 'success' });
    setTimeout(() => setToast(null), 2000);
  };

  const formatTime = (date: string) => {
    const now = new Date();
    const target = new Date(date);
    const diffMins = Math.floor((now.getTime() - target.getTime()) / 60000);
    if (diffMins < 1) return 'Justo ahora';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffMins < 1440) return `Hace ${Math.floor(diffMins / 60)} h`;
    return target.toLocaleDateString();
  };

  const filteredNotifications = filter === 'all' ? notifications : notifications.filter(n => !n.is_read);

  // SPINNER
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full border-4 border-primary/30 border-t-primary animate-spin mx-auto mb-4" />
          <p className="dark:text-gray-400 text-gray-600 text-lg font-medium">Cargando notificaciones...</p>
          <p className="dark:text-gray-600 text-gray-400 text-sm mt-1">Por favor espera</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-8"
    >
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 -mt-8 -mx-4 px-4 py-8 rounded-b-3xl">
        <div className="relative flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold dark:text-white text-gray-900">Notificaciones</h1>
              {unreadCount > 0 && (
                <span className="text-sm bg-primary/20 text-primary px-2.5 py-1 rounded-full">
                  {unreadCount} nuevas
                </span>
              )}
            </div>
            <p className="dark:text-gray-400 text-gray-600">Mantente al dia con tus reservas y novedades</p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead} className="flex items-center gap-1">
              <CheckCheck className="w-4 h-4" />
              Marcar todas
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            filter === 'all'
              ? 'bg-primary/20 text-primary border border-primary/30'
              : 'dark:bg-dark-muted bg-gray-100 dark:text-gray-400 text-gray-600 hover:dark:text-white hover:text-gray-900'
          }`}
        >
          Todas
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            filter === 'unread'
              ? 'bg-primary/20 text-primary border border-primary/30'
              : 'dark:bg-dark-muted bg-gray-100 dark:text-gray-400 text-gray-600 hover:dark:text-white hover:text-gray-900'
          }`}
        >
          No leidas
          {unreadCount > 0 && (
            <span className="ml-1.5 text-xs bg-primary/30 px-1.5 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {filteredNotifications.length === 0 ? (
        <EmptyState type="notifications" action={{ label: "Explorar packs", onClick: () => window.location.href = '/packs' }} />
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification, idx) => {
            const { icon: Icon, color, bg } = iconMap[notification.type] || defaultIcon;
            const isUnread = !notification.is_read;

            return (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                onClick={() => isUnread && markAsRead(notification.id)}
                className={`cursor-pointer transition-all duration-200 ${isUnread ? 'border-l-2 border-primary' : ''}`}
              >
                <Card glass className="p-5 group hover:border-primary/30">
                  <div className="flex gap-4">
                    <div className={`p-2.5 rounded-xl ${bg} flex-shrink-0`}>
                      <Icon className={`w-5 h-5 ${color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${isUnread ? 'dark:text-white text-gray-900 font-medium' : 'dark:text-gray-400 text-gray-600'}`}>
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[10px] text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(notification.created_at)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteNotification(notification.id); }}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </motion.div>
  );
}