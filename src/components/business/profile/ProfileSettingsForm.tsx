'use client';

import { useState } from 'react';
import { AlertTriangle, Trash2, ChevronRight, CheckCircle } from 'lucide-react';
import ConfirmModal from '@/components/ui/ConfirmModal';

interface ProfileSettingsFormProps {
  onDelete: () => void;
}

export default function ProfileSettingsForm({ onDelete }: ProfileSettingsFormProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const handleDeleteClick = () => {
    setModalOpen(true);
  };

  return (
    <>
      <div className="space-y-6">
        <div className="bg-black/40 backdrop-blur-sm border border-red-500/20 rounded-2xl p-6 lg:p-8">
          <h2 className="text-lg font-bold text-red-400 flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5" />
            Zona de peligro
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-black/40 rounded-xl">
              <div>
                <p className="text-sm font-medium text-white">Desactivar comercio</p>
                <p className="text-xs text-gray-500 mt-0.5">Tu comercio dejará de ser visible para los usuarios</p>
              </div>
              <button
                onClick={handleDeleteClick}
                className="flex items-center gap-2 text-sm text-red-400 border border-red-500/30 hover:bg-red-500/10 px-4 py-2 rounded-xl transition-all"
              >
                <Trash2 className="w-4 h-4" />
                Desactivar
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-black/40 rounded-xl">
              <div>
                <p className="text-sm font-medium text-white">Transferir propiedad</p>
                <p className="text-xs text-gray-500 mt-0.5">Transfiere este comercio a otro usuario</p>
              </div>
              <button className="flex items-center gap-2 text-sm text-gray-400 border border-white/10 hover:border-white/30 px-4 py-2 rounded-xl transition-all">
                <ChevronRight className="w-4 h-4" />
                Transferir
              </button>
            </div>
          </div>
        </div>

        <div className="bg-black/40 border border-white/10 rounded-xl p-4">
          <p className="text-xs text-gray-500 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-primary" />
            ¿Necesitas ayuda? Contacta a{' '}
            <a href="mailto:soporte@paporla.com" className="text-primary hover:underline">
              soporte@paporla.com
            </a>
          </p>
        </div>
      </div>

      <ConfirmModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={onDelete}
        title="Desactivar comercio"
        message="¿Estás seguro de que quieres desactivar este comercio? Los packs dejarán de ser visibles y no se podrán hacer nuevas reservas. Esta acción se puede revertir."
        confirmText="Sí, desactivar"
        cancelText="Cancelar"
      />
    </>
  );
}