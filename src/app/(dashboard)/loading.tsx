import DashboardSkeleton from '@/components/dashboard/DashboardSkeleton'

/**
 * Esqueleto de la ruta /dashboard.
 *
 * Antes esto devolvía `PageLoadingSpinner`, que es el esqueleto GENÉRICO de la
 * app (un círculo y dos tarjetas, centrado y estrecho). Y la página, al montar,
 * pinta el suyo propio: `DashboardSkeleton`, que tiene la forma real del panel
 * (banner, rejilla de cifras, acciones, actividad).
 *
 * Resultado: el usuario veía un esqueleto pequeño y genérico, y un instante
 * después SALTABA a otro grande y completamente distinto. Dos esqueletos
 * seguidos dan sensación de cosa rota, que es peor que esperar.
 *
 * Ahora los dos momentos pintan lo mismo: la transición es continua y parece
 * una sola carga.
 */
export default function Loading() {
  return <DashboardSkeleton />
}
