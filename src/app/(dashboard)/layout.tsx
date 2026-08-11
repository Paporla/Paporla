import UserSidebar from '@/components/dashboard/layout/UserSidebar'
import UserMobileNav from '@/components/dashboard/layout/UserMobileNav'
import Breadcrumbs from '@/components/ui/Breadcrumbs'
import PageTransition from '@/components/ui/PageTransition'
import { requireAuth } from '@/lib/auth/requireAuth'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireAuth(['user'])

  return (
    <div
      className="min-h-screen relative"
      style={{ background: 'linear-gradient(180deg, #0d1f14 0%, #0a0a1a 45%, #0a0a1a 55%, #0d1f14 100%)' }}
    >
      {/* Blobs decorativos al estilo landing */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/[0.04] rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-primary/[0.03] rounded-full blur-3xl" />
      </div>
      <div className="flex relative z-10">
        <UserSidebar />
        <div className="flex-1 lg:ml-72">
          <div className="pt-4 pb-20 lg:pb-12">
            <Breadcrumbs />
            <main id="main-content" tabIndex={-1} className="pb-12">
              <div className="container-page px-4 max-w-7xl mx-auto">
                <PageTransition>{children}</PageTransition>
              </div>
            </main>
          </div>
        </div>
      </div>
      <UserMobileNav />
    </div>
  )
}
