'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Button from '@/components/ui/Button';
import Toast from '@/components/ui/Toast';
import { supabaseBrowser } from '@/lib/supabase/client';
import { formatPrice } from '@/lib/utils/formatPrice';

interface PackDetailActionsProps {
  packId: string;
  shopId: string;
  priceCents: number;
  remainingStock: number;
  isActive: boolean;
  onSuccess?: () => void;
}

export default function PackDetailActions({
  packId,
  shopId,
  priceCents,
  remainingStock,
  isActive,
  onSuccess,
}: PackDetailActionsProps) {
  const { user } = useAuth();
  const router = useRouter();
  const supabase = supabaseBrowser();
  const [reserving, setReserving] = useState(false);
  const [error, setError] = useState('');

  const isAvailable = remainingStock > 0 && isActive;

  const handleReserve = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    setReserving(true);
    setError('');

    // Verificar reserva existente
    const { data: existing } = await supabase
      .from('reservations')
      .select('id')
      .eq('user_id', user.id)
      .eq('pack_id', packId)
      .not('status', 'in', '(cancelled,completed,no_show)')
      .maybeSingle();

    if (existing) {
      setError('Ya tienes una reserva activa para este pack');
      setReserving(false);
      return;
    }

    // Crear reserva
    const { error: reservationError } = await supabase
      .from('reservations')
      .insert({
        user_id: user.id,
        shop_id: shopId,
        pack_id: packId,
        quantity: 1,
        total_price_cents: priceCents,
        status: 'pending',
        payment_method: 'cash',
      });

    if (reservationError) {
      setError(reservationError.message);
      setReserving(false);
      return;
    }

    setReserving(false);
    onSuccess?.();
    router.push('/dashboard/reservations');
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-dark-card/90 backdrop-blur-xl border-t border-dark-border p-4 z-10">
        <div className="max-w-lg mx-auto flex items-center gap-4">
          <div>
            <p className="text-xs text-gray-500">Total a pagar</p>
            <p className="text-xl font-black text-primary">{formatPrice(priceCents)}</p>
          </div>
          <Button
            onClick={handleReserve}
            disabled={!isAvailable || reserving}
            loading={reserving}
            className="flex-1 py-4"
          >
            {!isAvailable ? 'Agotado' : 'Reservar ahora'}
          </Button>
        </div>
      </div>

      {error && <Toast message={error} type="error" onClose={() => setError('')} />}
    </>
  );
}