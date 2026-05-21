import Image from 'next/image';
import HeroSection from '@/components/landing/HeroSection';
import BenefitsSection from '@/components/landing/BenefitsSection';
import StatsSection from '@/components/landing/StatsSection';
import CTASection from '@/components/landing/CTASection';

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Banner con efecto tarjeta elevada */}
      <div className="relative pt-8 pb-6">
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-transparent dark:from-white/5" />
        
        <div className="relative flex justify-center group">
          <div className="relative w-full max-w-xs mx-auto transform transition-all duration-500 hover:scale-105">
            <div className="absolute -inset-2 dark:bg-black/50 bg-gray-200/50 rounded-2xl blur-xl opacity-0 group-hover:opacity-60 transition-opacity duration-500" />
            
            <Image
              src="/images/banner-optimized.webp"
              alt="Paporla - Rescate Alimentario"
              width={1200}
              height={800}
              className="w-full h-auto object-cover rounded-xl relative z-10 shadow-2xl dark:shadow-black/50 shadow-gray-300/50"
              priority
            />
            
            <div className="absolute inset-0 rounded-xl border dark:border-white/10 border-gray-300/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
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
  );
}