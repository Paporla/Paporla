'use client';

export default function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a1a] via-[#0f0f1a] to-[#020205]">
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full border-4 border-primary/30 border-t-primary animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-lg font-medium">Cargando tu panel...</p>
          <p className="text-gray-600 text-sm mt-1">Preparando tus reservas</p>
        </div>
      </div>
    </div>
  );
}