import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import PackFormSimplified from '@/components/business/PackFormSimplified'

interface DuplicatePackPageProps {
  params: Promise<{ id: string }>;
}

export default async function DuplicatePackPage({ params }: DuplicatePackPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: shop } = await supabase
    .from('shops')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (!shop) {
    redirect('/business/profile');
  }

  const { data: pack } = await supabase
    .from('packs')
    .select('*')
    .eq('id', id)
    .eq('shop_id', shop.id)
    .maybeSingle();

  if (!pack) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 -mt-8 -mx-4 px-4 py-8 rounded-b-3xl">
        <div className="relative">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold dark:text-white text-gray-900 mb-2">
              Duplicar Pack
            </h1>
            <p className="dark:text-gray-400 text-gray-600">Crea una copia de "{pack.title}" y modifica lo que necesites</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        <PackFormSimplified shopId={shop.id} pack={pack} isDuplicate />
      </div>
    </div>
  );
}