import { Suspense } from 'react';
import UserSidebar from '@/components/dashboard/layout/UserSidebar';
import UserMobileNav from '@/components/dashboard/layout/UserMobileNav';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import PageLoader from '@/components/ui/PageLoader';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({
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

  if (role !== 'user') {
    if (role === 'comercio') redirect('/business');
    if (role === 'admin' || role === 'super_admin') redirect('/admin');
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a1a] via-[#0f0f1a] to-[#020205]">
      <div className="flex">
        <UserSidebar />
        <div className="flex-1 lg:ml-72">
          <div className="pt-4 pb-20 lg:pb-12">
            <Breadcrumbs />
            <main className="pb-12">
              <div className="container-page px-4 max-w-7xl mx-auto">
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
        </div>
      </div>
      <UserMobileNav />
    </div>
  );
}