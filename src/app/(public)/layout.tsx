import { ReactNode } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <div className="pt-16 md:pt-20">
        <main>{children}</main>
      </div>
      <Footer />
    </>
  );
}