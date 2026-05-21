'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Package, Plus } from 'lucide-react';
import Button from '@/components/ui/Button';
import Toast from '@/components/ui/Toast';
import ConfirmModal from '@/components/ui/ConfirmModal';
import LoadingSkeleton from '@/components/business/LoadingSkeleton';
import { useBusinessPacks } from '@/components/business/packs/useBusinessPacks';
import PacksStatsGrid from '@/components/business/packs/PacksStatsGrid';
import PackFilters from '@/components/business/packs/PackFilters';
import PackGroup from '@/components/business/packs/PackGroup';

export default function BusinessPacksPage() {
  const {
    loading, error, success, setError, setSuccess,
    searchTerm, setSearchTerm, packs, stats,
    deleting, confirmDelete, handleDelete,
  } = useBusinessPacks();

  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [packToDelete, setPackToDelete] = useState<string | null>(null);

  // Separar packs activos e inactivos
  const activePacks = packs.filter(pack => pack.is_active);
  const inactivePacks = packs.filter(pack => !pack.is_active);

  // Filtrar por búsqueda
  const filteredActive = activePacks.filter(pack =>
    pack.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredInactive = inactivePacks.filter(pack =>
    pack.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const onDeleteClick = async (id: string) => {
    const result = await confirmDelete(id);
    if (result) {
      setPackToDelete(result);
      setModalOpen(true);
    }
  };

  const onConfirmDelete = async () => {
    if (packToDelete) {
      await handleDelete(packToDelete);
      setModalOpen(false);
      setPackToDelete(null);
    }
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-8 pb-8">
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

      {/* Packs Activos */}
      {filteredActive.length > 0 && (
        <PackGroup
          title="Packs Activos"
          packs={filteredActive}
          deleting={deleting}
          onDeleteClick={onDeleteClick}
        />
      )}

      {/* Historial (packs inactivos) */}
      {filteredInactive.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 pt-4">
            <div className="w-1 h-5 dark:bg-gray-600 bg-gray-300 rounded-full" />
            <h2 className="text-lg font-semibold dark:text-gray-400 text-gray-500">Historial</h2>
          </div>

          <PackGroup
            title="Packs Inactivos"
            packs={filteredInactive}
            deleting={deleting}
            onDeleteClick={onDeleteClick}
            emptyMessage="No hay packs inactivos"
          />
        </div>
      )}

      {/* Sin packs */}
      {filteredActive.length === 0 && filteredInactive.length === 0 && packs.length === 0 && (
        <div className="bg-dark-card dark:bg-white dark:border-gray-200 border dark:border-white/10 rounded-2xl p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <Package className="w-10 h-10 text-primary" />
          </div>
          <p className="dark:text-gray-400 text-gray-600">No tienes packs creados</p>
          <p className="text-xs dark:text-gray-500 text-gray-400 mt-1">Comienza a crear tu primer pack de rescate alimentario</p>
          <Link href="/business/packs/new">
            <Button className="mt-4">Crear mi primer pack</Button>
          </Link>
        </div>
      )}

      <ConfirmModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={onConfirmDelete}
        title="Eliminar pack"
        message="Si el pack tiene reservas en el historial, se desactivará (soft delete)."
        confirmText="Sí, eliminar"
        cancelText="Cancelar"
      />

      {error && <Toast message={error} type="error" onClose={() => setError('')} />}
      {success && <Toast message={success} type="success" onClose={() => setSuccess('')} />}
    </div>
  );
}