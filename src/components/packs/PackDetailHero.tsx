'use client';

interface PackDetailHeroProps {
  imageUrl: string | null;  // Cambiado: solo string | null, no undefined
  title: string;
  shopEmoji?: string;
}

export default function PackDetailHero({ imageUrl, title, shopEmoji = '📦' }: PackDetailHeroProps) {
  return (
        <div className="relative w-full h-56 md:h-64 overflow-hidden">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
              <span className="text-8xl">{shopEmoji}</span>
            </div>
          )}

          {/* Overlay gradiente */}
          <div className="absolute inset-0 bg-gradient-to-t from-dark/80 via-dark/30 to-transparent" />
        </div>
  );
}