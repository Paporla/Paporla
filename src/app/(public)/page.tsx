import Image from 'next/image'
import HeroSection from '@/components/landing/HeroSection'
import BenefitsSection from '@/components/landing/BenefitsSection'
import StatsSection from '@/components/landing/StatsSection'
import CTASection from '@/components/landing/CTASection'

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Banner con Luna animada + imagen centrada */}
      <div className="relative pt-4 pb-2">
        <div className="relative flex justify-center">
          {/* Luna como marco */}
          <div className="relative w-52 h-52 md:w-60 md:h-60 group">
            {/* Glow exterior al hacer hover */}
            <div className="absolute -inset-3 bg-primary/5 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            {/* Luna de fondo */}
            <div className="moon-banner absolute inset-0" />

            {/* Imagen del banner centrada */}
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <Image
                src="/images/banner-optimized.webp"
                alt="Paporla - Rescate Alimentario"
                width={160}
                height={160}
                className="w-32 h-32 md:w-36 md:h-36 rounded-full object-cover shadow-2xl shadow-black/50 border-2 border-white/10 group-hover:scale-105 transition-transform duration-500"
                priority
              />
            </div>
          </div>
        </div>
      </div>

      <main>
        <HeroSection />
        <BenefitsSection />
        <StatsSection />
        <CTASection />
      </main>
    </div>
  )
}
