import { Suspense } from 'react'
import BusinessSidebar from '@/components/business/layout/BusinessSidebar'
import BusinessMobileNav from '@/components/business/layout/BusinessMobileNav'
import Breadcrumbs from '@/components/ui/Breadcrumbs'
import PageLoader from '@/components/ui/PageLoader'
import PageTransition from '@/components/ui/PageTransition'
import { requireAuth } from '@/lib/auth/requireAuth'

export default async function BusinessLayout({ children }: { children: React.ReactNode }) {
  await requireAuth(['comercio'])

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a1a] via-[#0f0f1a] to-[#020205]">
      <div className="flex">
        <BusinessSidebar />
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
      <BusinessMobileNav />
    </div>
  )
}
