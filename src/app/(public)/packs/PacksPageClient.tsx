'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { supabaseBrowser } from '@/lib/supabase/client';
import { usePublicPacks } from '@/components/packs/usePublicPacks';
import PackFiltersAdvanced from '@/components/packs/PackFiltersAdvanced';
import PackCardPublic from '@/components/packs/PackCardPublic';
import Pagination from '@/components/ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';
import Toast from '@/components/ui/Toast';
import PacksHeroSection from '@/components/packs/PacksHeroSection';
import PacksLoadingGrid from '@/components/packs/PacksLoadingGrid';

const ITEMS_PER_PAGE = 9;

export default function PacksPage() {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = supabaseBrowser();
  const { packs, loading, error, setError, filters, setFilters } = usePublicPacks();
  const [currentPage, setCurrentPage] = useState(1);
  const [reserving, setReserving] = useState<string | null>(null);

  const totalPages = Math.ceil(packs.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentPacks = useMemo(() => packs.slice(startIndex, startIndex + ITEMS_PER_PAGE), [packs, startIndex]);

  const handleFilterChange = (f: typeof filters) => {
    setFilters(f);
    setCurrentPage(1);
  };

  const handleReserve = async (packId: string) => {
    if (!user) { router.push('/login'); return; }
    setReserving(packId);
    setError('');

    try {
      const { data: pack } = await supabase.from('packs').select('shop_id, price_cents').eq('id', packId).maybeSingle();
      if (!pack) throw new Error('Pack no encontrado');

      const { data: existing } = await supabase.from('reservations').select('id')
        .eq('user_id', user.id).eq('pack_id', packId).in('status', ['pending', 'confirmed']).maybeSingle();
      if (existing) throw new Error('Ya tienes una reserva activa');

      const { error: resErr } = await supabase.from('reservations').insert({
        user_id: user.id, shop_id: pack.shop_id, pack_id: packId, quantity: 1,
        total_price_cents: pack.price_cents, status: 'pending',
        payment_method: 'cash', payment_status: 'pending', reserved_at: new Date().toISOString(),
      });
      if (resErr) throw resErr;
      router.push('/dashboard?reserved=true');
    } catch (err: any) {
      setError(err.message);
      setReserving(null);
    }
  };

  if (loading) return <PacksLoadingGrid />;

  return (
    <div className="min-h-screen bg-black">
      <PacksHeroSection count={packs.length} />

      <div className="container mx-auto px-4 py-8">
        <PackFiltersAdvanced onFilterChange={handleFilterChange} />

        {!loading && packs.length === 0 ? (
          <EmptyState type="packs" action={{
            label: "Limpiar filtros",
            onClick: () => handleFilterChange({ search: '', minPrice: 0, maxPrice: 100000, showAvailableOnly: false, city: '' })
          }} />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentPacks.map((pack, idx) => (
                <PackCardPublic key={pack.id} pack={pack} onReserve={handleReserve} index={idx} reserving={reserving} />
              ))}
            </div>
            {totalPages > 1 && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />}
          </>
        )}
      </div>

      {error && <Toast message={error} type="error" onClose={() => setError('')} />}
    </div>
  );
}
