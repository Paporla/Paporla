'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { pageVariants } from '@/lib/utils/motion'
import Link from 'next/link'
import { Package, Plus } from 'lucide-react'
import Button from '@/components/ui/Button'
import Toast from '@/components/ui/Toast'
import LoadingSkeleton from '@/components/business/LoadingSkeleton'
import { useBusinessPacks } from '@/components/business/packs/useBusinessPacks'
import PacksStatsGrid from '@/components/business/packs/PacksStatsGrid'
import PackFilters from '@/components/business/packs/PackFilters'
import PackGroup from '@/components/business/packs/PackGroup'
import ConfirmModal from '@/components/ui/ConfirmModal'
import type { BusinessPack } from '@/components/business/packs/useBusinessPacks'

export default function BusinessPacksPage() {
  const {
    loading,
    error,
    success,
    setError,
    setSuccess,
    searchTerm,
    setSearchTerm,
    packs,
    stats,
    updatingPackId,
    archivingPackId,
    changePackState,
    archivePack,
  } = useBusinessPacks()

  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')

  /*
   * Pack pendiente de confirmar su eliminación, o `null` si el modal está cerrado.
   *
   * Guardamos el pack entero y no solo su id porque el modal necesita el título:
   * un diálogo que dice «¿Eliminar este pack?» no permite detectar que se pulsó
   * en la tarjeta equivocada. Nombrar lo que se va a destruir es lo que convierte
   * la confirmación en una comprobación real y no en un trámite que se acepta sin leer.
   */
  const [packToDelete, setPackToDelete] = useState<BusinessPack | null>(null)

  const confirmDelete = async () => {
    if (!packToDelete) return
    const id = packToDelete.id
    // Cerramos primero: el spinner de la tarjeta ya indica que la acción sigue en curso.
    setPackToDelete(null)
    await archivePack(id)
  }

  // `packs` ya viene filtrado por término de búsqueda desde el hook: no repetimos
  // aquí ese filtro (antes se aplicaba dos veces, una en el hook y otra en la página).
  //
  // "Publicados" son los que el cliente puede comprar ahora mismo. Todo lo demás
  // —borradores, pausados, agotados, caducados— es historial: sigue existiendo y
  // el comerciante lo ve, pero no está a la venta.
  const publishedPacks = packs.filter((pack) => pack.status === 'active')
  const historyPacks = packs.filter((pack) => pack.status !== 'active')

  // El desplegable de estado no filtraba nada: se leía su valor pero nunca se usaba.
  const showPublished = filterStatus === 'all' || filterStatus === 'active'
  const showHistory = filterStatus === 'all' || filterStatus === 'inactive'

  const visiblePublished = showPublished ? publishedPacks : []
  const visibleHistory = showHistory ? historyPacks : []
  const hasVisiblePacks = visiblePublished.length > 0 || visibleHistory.length > 0

  if (loading) return <LoadingSkeleton />

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="space-y-8 pb-8">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 -mt-8 -mx-4 px-4 py-8 rounded-b-3xl">
        <div className="relative">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold dark:text-white text-gray-900">Mis Packs</h1>
              </div>
              <p className="dark:text-gray-400 text-gray-600">Gestiona todos tus packs de rescate alimentario</p>
            </div>
            <Link href="/business/packs/new">
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Crear nuevo pack
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <PacksStatsGrid stats={stats} />

      {/* Filtros */}
      <PackFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filterStatus={filterStatus}
        onStatusChange={setFilterStatus}
      />

      {/* Packs publicados: visibles ahora mismo en el catálogo */}
      {visiblePublished.length > 0 && (
        <PackGroup
          title="Packs publicados"
          packs={visiblePublished}
          updatingPackId={updatingPackId}
          onChangeState={changePackState}
          archivingPackId={archivingPackId}
          onRequestDelete={setPackToDelete}
          defaultExpanded
        />
      )}

      {/* Historial: existen pero no están a la venta */}
      {visibleHistory.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 pt-4">
            <div className="w-1 h-5 dark:bg-gray-600 bg-gray-300 rounded-full" />
            <h2 className="text-lg font-semibold dark:text-gray-400 text-gray-500">Historial</h2>
          </div>

          <PackGroup
            title="Borradores, pausados y finalizados"
            packs={visibleHistory}
            updatingPackId={updatingPackId}
            onChangeState={changePackState}
            archivingPackId={archivingPackId}
            onRequestDelete={setPackToDelete}
            emptyMessage="No hay packs en el historial"
          />
        </div>
      )}

      {/* Sin resultados para la búsqueda o el filtro actuales */}
      {!hasVisiblePacks && packs.length === 0 && searchTerm.trim() !== '' && (
        <div className="glass-card rounded-2xl p-12 text-center">
          <p className="dark:text-gray-400 text-gray-600">Ningún pack coincide con &laquo;{searchTerm}&raquo;</p>
          <Button variant="outline" className="mt-4" onClick={() => setSearchTerm('')}>
            Limpiar búsqueda
          </Button>
        </div>
      )}

      {!hasVisiblePacks && packs.length > 0 && (
        <div className="glass-card rounded-2xl p-12 text-center">
          <p className="dark:text-gray-400 text-gray-600">
            No hay packs {filterStatus === 'active' ? 'publicados' : 'en el historial'}
          </p>
          <Button variant="outline" className="mt-4" onClick={() => setFilterStatus('all')}>
            Ver todos
          </Button>
        </div>
      )}

      {/* Sin packs en absoluto */}
      {packs.length === 0 && searchTerm.trim() === '' && (
        <div className="glass-card rounded-2xl p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <Package className="w-10 h-10 text-primary" />
          </div>
          <p className="dark:text-gray-400 text-gray-600">No tienes packs creados</p>
          <p className="text-xs dark:text-gray-500 text-gray-400 mt-1">
            Comienza a crear tu primer pack de rescate alimentario
          </p>
          <Link href="/business/packs/new">
            <Button className="mt-4">Crear mi primer pack</Button>
          </Link>
        </div>
      )}

      {/*
        `confirmText` es obligatorio aquí: el valor por defecto de ConfirmModal es
        «Cancelar reserva», heredado de su primer uso. Sin pasarlo, el modal de
        eliminar un pack mostraría un botón que habla de reservas.
      */}
      <ConfirmModal
        isOpen={packToDelete !== null}
        onClose={() => setPackToDelete(null)}
        onConfirm={confirmDelete}
        title="Eliminar pack"
        message={
          packToDelete
            ? `Se eliminará «${packToDelete.title}» de tu listado. Esta acción no se puede deshacer. Si solo quieres retirarlo del catálogo temporalmente, pausalo en su lugar.`
            : ''
        }
        confirmText="Eliminar pack"
        cancelText="Conservar"
      />

      {error && <Toast message={error} type="error" onClose={() => setError('')} />}
      {success && <Toast message={success} type="success" onClose={() => setSuccess('')} />}
    </motion.div>
  )
}
