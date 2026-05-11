import Image from 'next/image';
import HeroSection from '@/components/landing/HeroSection';
import BenefitsSection from '@/components/landing/BenefitsSection';
import StatsSection from '@/components/landing/StatsSection';
import CTASection from '@/components/landing/CTASection';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black">
      {/* Banner con efecto tarjeta elevada */}
      <div className="relative pt-8 pb-6">
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-transparent" />
        
        <div className="relative flex justify-center group">
          <div className="relative w-full max-w-xs mx-auto transform transition-all duration-500 hover:scale-105">
            {/* Sombra limpia detrás del banner (sin color verde) */}
            <div className="absolute -inset-2 bg-black/50 rounded-2xl blur-xl opacity-0 group-hover:opacity-60 transition-opacity duration-500" />
            
            <Image
              src="/images/banner-optimized.webp"
              alt="Paporla - Rescate Alimentario"
              width={1200}
              height={800}
              className="w-full h-auto object-cover rounded-xl relative z-10 shadow-2xl shadow-black/50"
              priority
            />
            
            {/* Borde decorativo sutil */}
            <div className="absolute inset-0 rounded-xl border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
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