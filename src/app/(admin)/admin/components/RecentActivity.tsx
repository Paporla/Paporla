'use client'

import { motion } from 'framer-motion'
import { UserPlus, ShoppingBag, Store, Package, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react'
import { useState, useEffect } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'

interface Activity {
  id: string
  type: string
  severity: string
  title: string
  description: string
  created_at: string
  user_id?: string
  shop_id?: string
  metadata?: Record<string, unknown>
}

const getIcon = (type: string, severity: string) => {
  if (type === 'user_registered') return { icon: UserPlus, color: 'text-blue-400', bg: 'bg-blue-500/10' }
  if (type === 'pack_reserved') return { icon: ShoppingBag, color: 'text-primary', bg: 'bg-primary/10' }
  if (type === 'shop_created') return { icon: Store, color: 'text-violet-400', bg: 'bg-violet-500/10' }
  if (type === 'pack_created') return { icon: Package, color: 'text-amber-400', bg: 'bg-amber-500/10' }
  if (severity === 'warning') return { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' }
  if (severity === 'danger') return { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' }
  if (severity === 'success') return { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10' }
  return { icon: ShoppingBag, color: 'text-primary', bg: 'bg-primary/10' }
}

const formatTime = (date: string) => {
  const diff = Date.now() - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (minutes < 1) return 'Hace unos segundos'
  if (minutes < 60) return `Hace ${minutes} min`
  if (hours < 24) return `Hace ${hours} h`
  return `Hace ${days} d`
}

export default function RecentActivity() {
  const supabase = supabaseBrowser()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    loadActivities()
  }, [])

  const loadActivities = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(showAll ? 50 : 10)

    if (error) {
      console.error('Error loading activities:', error)
    } else {
      setActivities(data || [])
    }
    setLoading(false)
  }

  const displayedActivities = showAll ? activities : activities.slice(0, 5)

  if (loading) {
    return (
      <div className="dark:bg-black/40 bg-gray-50 backdrop-blur-sm dark:border-white/10 border-gray-200 rounded-2xl overflow-hidden">
        <div className="animate-pulse p-6">
          <div className="h-6 w-32 dark:bg-gray-800 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-48 dark:bg-gray-800 bg-gray-200 rounded" />
          <div className="space-y-3 mt-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 dark:bg-gray-800 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="dark:bg-black/40 bg-gray-50 backdrop-blur-sm dark:border-white/10 border-gray-200 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between p-6 pb-4">
        <div>
          <h3 className="text-lg font-semibold dark:text-white text-gray-900">Actividad reciente</h3>
          <p className="text-xs dark:text-gray-500 text-gray-400 mt-1">Ultimas acciones en la plataforma</p>
        </div>
        {activities.length > 5 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
          >
            {showAll ? 'Ver menos' : 'Ver todo'}
          </button>
        )}
      </div>

      <div className="dark:divide-white/5 divide-gray-200">
        {displayedActivities.length === 0 ? (
          <div className="text-center py-12">
            <p className="dark:text-gray-500 text-gray-400 text-sm">No hay actividad reciente</p>
            <p className="text-xs dark:text-gray-600 text-gray-500 mt-1">Los eventos apareceran aqui automaticamente</p>
          </div>
        ) : (
          displayedActivities.map((activity, i) => {
            const { icon: Icon, color, bg } = getIcon(activity.type, activity.severity)
            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-start gap-4 px-6 py-4 dark:hover:bg-white/5 hover:bg-gray-100 transition-colors group"
              >
                <div className={`p-2 rounded-xl ${bg} flex-shrink-0 mt-0.5`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium dark:text-white text-gray-900">{activity.title}</p>
                  <p className="text-xs dark:text-gray-500 text-gray-400 mt-0.5">{activity.description}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="flex items-center gap-1 text-[10px] dark:text-gray-600 text-gray-500 whitespace-nowrap">
                    <Clock className="w-3 h-3" />
                    {formatTime(activity.created_at)}
                  </span>
                </div>
              </motion.div>
            )
          })
        )}
      </div>
    </div>
  )
}
