'use client'

import Link from 'next/link'
import { Copy, ArrowRight } from 'lucide-react'
import type { DashboardPack } from '@/components/business/dashboard/useBusinessDashboard'

/**
 * Atajo «Repetir mi último pack» (Lote C simplificación UX).
 *
 * EL hábito que hace sostenible Paporla para un comercio es publicar cada
 * día un pack casi igual al de ayer. El camino ya existe (Duplicar, que
 * copia todo y pone la fecha en mañana), pero vive enterrado en la lista de
 * packs y el comercio primerizo no lo descubre.
 *
 * Esta tarjeta lo pone en el panel EXACTAMENTE cuando toca:
 *   - hay al menos un pack anterior (hay algo que repetir), y
 *   - no hay ningún pack activo ahora (no está vendiendo nada).
 * Es decir: la mañana siguiente, antes de publicar. Si ya hay un pack a la
 * venta, la tarjeta sobra y no aparece (cero ruido).
 *
 * `packs` llega de list_my_packs vía useBusinessDashboard: ordenados por
 * created_at DESC (0014:465), sin archivados. El más reciente es packs[0].
 */
export default function RepeatLastPackCard({ packs }: { packs: DashboardPack[] }) {
  if (packs.length === 0) return null
  if (packs.some((p) => p.status === 'active')) return null

  const lastPack = packs[0]

  return (
    <section aria-label="Repetir mi último pack" className="glass-card rounded-2xl border border-primary/20 p-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Copy className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold dark:text-white text-gray-900">¿Hoy también tienes excedentes?</h2>
          <p className="text-sm dark:text-gray-400 text-gray-600 mt-0.5">
            Repite <span className="font-medium dark:text-gray-200 text-gray-800">«{lastPack.title}»</span> en dos
            toques: la fecha ya viene puesta en mañana, solo revisa y publica.
          </p>
        </div>
        <Link
          href={`/business/packs/${lastPack.id}/duplicate`}
          className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-light text-dark font-bold px-5 py-3 rounded-xl transition-all text-sm flex-shrink-0"
        >
          Repetir mi último pack <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  )
}
