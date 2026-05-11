'use client';

import Skeleton from '@/components/ui/Skeleton';

export default function PackFormSkeleton() {
  return (
    <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-white/10">
      <div className="space-y-6">
        {/* Título de sección */}
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-6 w-6 rounded-lg bg-gray-700" />
          <Skeleton className="h-6 w-32 bg-gray-700" />
        </div>
        
        {/* Campos */}
        <div className="space-y-4">
          <Skeleton className="h-14 w-full rounded-xl bg-gray-700" />
          <Skeleton className="h-32 w-full rounded-xl bg-gray-700" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-14 w-full rounded-xl bg-gray-700" />
            <Skeleton className="h-14 w-full rounded-xl bg-gray-700" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-14 w-full rounded-xl bg-gray-700" />
            <Skeleton className="h-14 w-full rounded-xl bg-gray-700" />
          </div>
          
          <Skeleton className="h-14 w-full rounded-xl bg-gray-700" />
        </div>
        
        {/* Separador */}
        <div className="border-t border-white/10 pt-4">
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="h-6 w-6 rounded-lg bg-gray-700" />
            <Skeleton className="h-6 w-24 bg-gray-700" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-14 w-full rounded-xl bg-gray-700" />
            <Skeleton className="h-14 w-full rounded-xl bg-gray-700" />
          </div>
        </div>
        
        {/* Botón */}
        <div className="flex justify-end pt-4">
          <Skeleton className="h-12 w-32 rounded-full bg-gray-700" />
        </div>
      </div>
    </div>
  );
}