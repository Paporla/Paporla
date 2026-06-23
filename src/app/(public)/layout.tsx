import { ReactNode, Suspense } from 'react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import Breadcrumbs from '@/components/ui/Breadcrumbs'
import PageLoader from '@/components/ui/PageLoader'
import PageTransition from '@/components/ui/PageTransition'

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <div className="pt-16 md:pt-20 dark:bg-gradient-to-b dark:from-primary/[0.18] dark:via-black dark:to-primary/[0.18]">
        <Breadcrumbs />
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center">
                <PageLoader />
              </div>
            </div>
          }
        >
          <main id="main-content" tabIndex={-1}>
            <div className="container-page px-4 max-w-7xl mx-auto">
              <PageTransition>{children}</PageTransition>
            </div>
          </main>
        </Suspense>
        <Footer />
      </div>
    </>
  )
}
