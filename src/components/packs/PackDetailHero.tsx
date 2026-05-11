'use client';

interface PackDetailHeroProps {
  imageUrl: string | null;  // Cambiado: solo string | null, no undefined
  title: string;
  shopEmoji?: string;
}

export default function PackDetailHero({ imageUrl, title, shopEmoji = '📦' }: PackDetailHeroProps) {
  return (
    <div className="h-56 bg-dark-muted flex items-center justify-center relative -mt-16 overflow-hidden">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="text-8xl">{shopEmoji}</span>
      )}

      {/* Overlay gradiente para mejorar legibilidad */}
      <div className="absolute inset-0 bg-gradient-to-t from-dark/80 via-transparent to-dark/20" />
    </div>
  );
}