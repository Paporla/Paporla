'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { ArrowLeft, Clock, MapPin, Phone, Store } from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase/client'
import { DAY_LABELS, weekdayToDisplayIndex } from '@/lib/constants/hours'
import type { HoursData } from '@/lib/utils/shopHours'

interface ProfilePreviewProps {
  formData: {
    name: string
    description: string
    category: string
    address: string
    city: string
    phone: string
    logoUrl: string
    coverUrl: string
  }
  hours: HoursData
  onBack: () => void
}

function publicUrl(stored: string) {
  if (!stored) return null
  if (stored.startsWith('http') || stored.startsWith('blob:')) return stored
  return supabaseBrowser().storage.from('shop-images').getPublicUrl(stored).data.publicUrl
}

/** Normaliza '09:00:00' o '09:00' a '09:00' para mostrarlo. */
function displayTime(value: string | undefined): string {
  if (!value) return ''
  return value.slice(0, 5)
}

export default function ProfilePreview({ formData, hours, onBack }: ProfilePreviewProps) {
  const coverSrc = publicUrl(formData.coverUrl)
  const logoSrc = publicUrl(formData.logoUrl)

  /**
   * El día actual se calcula en el cliente, nunca durante el renderizado del
   * servidor: si el servidor y el navegador estuvieran en husos distintos (o
   * simplemente cruzaran la medianoche entre una cosa y otra) React avisaría de
   * un desajuste de hidratación. Empieza en null y se rellena tras montar.
   */
  const [todayIndex, setTodayIndex] = useState<number | null>(null)

  useEffect(() => {
    // getDay() devuelve 0=domingo..6=sábado, la misma convención canónica que
    // usa la base de datos. weekdayToDisplayIndex lo pasa al orden de la UI,
    // que empieza en lunes.
    setTodayIndex(weekdayToDisplayIndex(new Date().getDay()))
  }, [])

  const hasAnyHours = DAY_LABELS.some((day) => hours?.[day])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 dark:text-gray-400 text-gray-600 dark:hover:text-white hover:text-gray-900 transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al editor
        </button>
        <span className="text-xs dark:text-gray-500 text-gray-400 dark:bg-black/40 bg-gray-100 px-3 py-1.5 rounded-full">
          Vista previa — así te ven en Paporla
        </span>
      </div>

      <div className="max-w-md mx-auto dark:bg-black/40 bg-white dark:border-white/10 border-gray-200 rounded-3xl overflow-hidden">
        <div className="h-40 bg-gradient-to-br from-primary/20 via-black/40 to-secondary/20 relative">
          {coverSrc ? (
            <Image src={coverSrc} alt="" fill className="object-cover" sizes="448px" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Store className="w-12 h-12 text-gray-500" />
            </div>
          )}
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            {logoSrc ? (
              <Image src={logoSrc} alt="" width={48} height={48} className="w-12 h-12 rounded-xl object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <Store className="w-6 h-6 text-primary" />
              </div>
            )}
            <div>
              <h3 className="font-bold dark:text-white text-gray-900">{formData.name || 'Mi Comercio'}</h3>
              <p className="text-xs dark:text-gray-500 text-gray-400">{formData.city || 'Santiago'}</p>
            </div>
          </div>

          <p className="text-sm dark:text-gray-400 text-gray-600 leading-relaxed">
            {formData.description || 'Sin descripción'}
          </p>

          <div className="space-y-2 text-xs dark:text-gray-500 text-gray-400">
            {formData.address && (
              <p className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                {formData.address}
              </p>
            )}
            {formData.phone && (
              <p className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-primary" />
                {formData.phone}
              </p>
            )}
          </div>

          {hasAnyHours && (
            <div className="pt-4 border-t dark:border-white/10 border-gray-200 space-y-2">
              <p className="text-xs font-medium dark:text-gray-300 text-gray-700 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-primary" />
                Horarios de atención
              </p>

              <ul className="space-y-1">
                {DAY_LABELS.map((day, index) => {
                  const entry = hours?.[day]
                  const closed = !entry || entry.closed
                  const isToday = todayIndex === index

                  return (
                    <li
                      key={day}
                      className={`flex items-center justify-between text-xs rounded-md px-2 py-1 ${
                        isToday ? 'dark:bg-primary/10 bg-primary/5' : ''
                      }`}
                    >
                      <span
                        className={
                          isToday
                            ? 'font-medium text-primary'
                            : closed
                              ? 'dark:text-gray-600 text-gray-400'
                              : 'dark:text-gray-400 text-gray-600'
                        }
                      >
                        {day}
                        {isToday && <span className="ml-1.5 text-[10px] uppercase tracking-wide">hoy</span>}
                      </span>

                      {closed ? (
                        <span className="dark:text-gray-600 text-gray-400">Cerrado</span>
                      ) : (
                        <span className={isToday ? 'font-medium text-primary' : 'dark:text-gray-300 text-gray-700'}>
                          {displayTime(entry.open)} – {displayTime(entry.close)}
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
