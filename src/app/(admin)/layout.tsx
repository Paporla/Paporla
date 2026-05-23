import { Suspense } from 'react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import Breadcrumbs from '@/components/ui/Breadcrumbs'
import PageLoader from '@/components/ui/PageLoader'
import PageTransition from '@/components/ui/PageTransition'
import AdminSidebar from '@/components/admin/layout/AdminSidebar'
import AdminMobileNav from '@/components/admin/layout/AdminMobileNav'
import { requireAuth } from '@/lib/auth/requireAuth'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAuth(['admin', 'super_admin'])

  return (
    <div className="min-h-screen">
      <Header />
      <div className="flex">
        <AdminSidebar />
        <div className="flex-1 lg:ml-72 pt-16">
          <Breadcrumbs />
          <main id="main-content" className="pb-12">
            <div className="container-page">
              <Suspense
                fallback={
                  <div className="flex items-center justify-center min-h-[60vh]">
                    <PageLoader />
                  </div>
                }
              >
                <PageTransition>{children}</PageTransition>
              </Suspense>
            </div>
          </main>
        </div>
      </div>
      <AdminMobileNav />
      <Footer />
    </div>
  )
}
