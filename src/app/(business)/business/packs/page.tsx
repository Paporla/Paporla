'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Package, Plus, Search } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Toast from '@/components/ui/Toast';
import ConfirmModal from '@/components/ui/ConfirmModal';
import LoadingSkeleton from '@/components/business/LoadingSkeleton';
import { useBusinessPacks } from '@/components/business/packs/useBusinessPacks';
import PacksStatsGrid from '@/components/business/packs/PacksStatsGrid';
import PackCard from '@/components/business/packs/PackCard';

export default function BusinessPacksPage() {
  const {
    loading, error, success, setError, setSuccess,
    searchTerm, setSearchTerm, packs, stats,
    deleting, confirmDelete, handleDelete,
  } = useBusinessPacks();

  const [modalOpen, setModalOpen] = useState(false);
  const [packToDelete, setPackToDelete] = useState<string | null>(null);

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
    <div className="space-y-8">
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 -mt-8 -mx-4 px-4 py-8 rounded-b-3xl">
        <div className="relative">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Mis Packs</h1>
              <p className="text-gray-400">Gestiona todos tus packs de rescate alimentario</p>
            </div>
            <Link href="/business/packs/new">
              <Button className="flex items-center gap-2"><Plus className="w-4 h-4" /> Crear nuevo pack</Button>
            </Link>
          </div>
        </div>
      </div>

      <PacksStatsGrid stats={stats} />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <Input placeholder="Buscar packs por nombre..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
      </div>

      {packs.length === 0 ? (
        <Card glass className="text-center py-12">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <Package className="w-10 h-10 text-primary" />
          </div>
          <p className="text-gray-400">No tienes packs creados</p>
          <p className="text-xs text-gray-500 mt-1">Comienza a crear tu primer pack de rescate alimentario</p>
          <Link href="/business/packs/new"><Button className="mt-4">Crear mi primer pack</Button></Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {packs.map((pack, index) => (
            <PackCard key={pack.id} pack={pack} index={index} deleting={deleting} onDeleteClick={onDeleteClick} />
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={onConfirmDelete}
        title="Eliminar pack"
        message="Si el pack tiene reservas en el historico, se desactivara (soft delete)."
        confirmText="Si, eliminar"
        cancelText="Cancelar"
      />

      {error && <Toast message={error} type="error" onClose={() => setError('')} />}
      {success && <Toast message={success} type="success" onClose={() => setSuccess('')} />}
    </div>
  );
}
