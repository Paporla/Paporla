import { Suspense } from 'react'
import Breadcrumbs from '@/components/ui/Breadcrumbs'
import PageLoader from '@/components/ui/PageLoader'
import PageTransition from '@/components/ui/PageTransition'
import AdminSidebar from '@/components/admin/layout/AdminSidebar'
import AdminMobileNav from '@/components/admin/layout/AdminMobileNav'
import { requireAuth } from '@/lib/auth/requireAuth'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAuth(['admin', 'super_admin'])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-[#0a0a1a] dark:via-[#0f0f1a] dark:to-[#020205]">
      <div className="flex">
        <AdminSidebar />
        <div className="flex-1 lg:ml-72">
          <div className="pt-4 pb-20 lg:pb-12">
            <Breadcrumbs />
            <main id="main-content" tabIndex={-1} className="pb-12">
              <div className="container-page px-4 max-w-7xl mx-auto">
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
      </div>
      <AdminMobileNav />
    </div>
  )
}
