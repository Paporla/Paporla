import { Suspense } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import PageLoader from '@/components/ui/PageLoader';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const role = profile?.role;

  // Solo admin y super_admin pueden entrar
  if (role !== 'admin' && role !== 'super_admin') {
    if (role === 'comercio') redirect('/business');
    redirect('/dashboard');
  }

    return (
    <div className="min-h-screen">
      <Header />
      <div className="pt-16">
        <Breadcrumbs />
        <main className="pb-12">
          <div className="container-page">
            <Suspense fallback={
              <div className="flex items-center justify-center min-h-[60vh]">
                <PageLoader />
              </div>
            }>
              {children}
            </Suspense>
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}