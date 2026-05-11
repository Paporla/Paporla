'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, CheckCheck } from 'lucide-react';
import NotificationList from '@/components/notifications/NotificationList';
import EmptyState from '@/components/ui/EmptyState';
import { supabaseBrowser } from '@/lib/supabase/client';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    const { data } = await supabaseBrowser()
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });
    setNotifications(data || []);
    setLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 pb-24 lg:pb-6"
    >
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <Bell className="w-6 h-6 text-primary" />
          Notificaciones
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Mantente al dia con tus reservas y novedades
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-800/50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState type="notifications" />
      ) : (
        <NotificationList />
      )}
    </motion.div>
  );
}

