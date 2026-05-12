import { ReactNode, Suspense } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import PageLoader from '@/components/ui/PageLoader';

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <div className="pt-16 md:pt-20">
        <Breadcrumbs />
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <PageLoader />
            </div>
          </div>
        }>
          <main>{children}</main>
        </Suspense>
      </div>
      <Footer />
    </>
  );
}