import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ImageWithFallback } from '../ImageWithFallback';

interface ProductGalleryCarouselProps {
  images: string[];
  autoPlay?: boolean;
  interval?: number; // default 4000
  productName: string;
}

export function ProductGalleryCarousel({
  images,
  autoPlay = false,
  interval = 4000,
  productName,
}: ProductGalleryCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  useEffect(() => {
    if (!autoPlay || images.length <= 1) return;

    const timer = setInterval(goToNext, interval);
    return () => clearInterval(timer);
  }, [autoPlay, images.length, interval, goToNext]);

  if (!images || images.length === 0) return null;

  return (
    <div className="relative w-full h-full group overflow-hidden bg-gray-100">
      <div 
        className="flex h-full transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {images.map((imgUrl, idx) => (
          <div key={idx} className="w-full h-full flex-shrink-0">
            <ImageWithFallback
              src={imgUrl}
              alt={`${productName} - Imagem ${idx + 1}`}
              className="w-full h-full object-cover"
              fallbackClassName="w-full h-full bg-gray-200 flex items-center justify-center p-4"
            />
          </div>
        ))}
      </div>

      {images.length > 1 && (
        <>
          {/* Controles Manuais (Visíveis no hover ou sempre em touch devices de forma sutil) */}
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); goToPrev(); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/30 hover:bg-black/50 text-white rounded-full backdrop-blur-sm transition-opacity opacity-0 group-hover:opacity-100 opacity-60 md:opacity-0"
            aria-label="Imagem anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); goToNext(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/30 hover:bg-black/50 text-white rounded-full backdrop-blur-sm transition-opacity opacity-0 group-hover:opacity-100 opacity-60 md:opacity-0"
            aria-label="Próxima imagem"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Indicadores (Dots) */}
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10">
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrentIndex(idx); }}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === currentIndex ? 'bg-white scale-125' : 'bg-white/50 hover:bg-white/80'
                }`}
                aria-label={`Ir para imagem ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
