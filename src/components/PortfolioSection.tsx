import { useState } from 'react';
import { Globe, ExternalLink, Eye, X } from 'lucide-react';

interface PortfolioSectionProps {
  portfolioLink: string | null;
  portfolioFotos: string[] | null;
  isDark?: boolean;
}

export function PortfolioSection({ portfolioLink, portfolioFotos, isDark = false }: PortfolioSectionProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const hasLink = !!portfolioLink;
  const hasFotos = !!portfolioFotos && portfolioFotos.length > 0;

  if (!hasLink && !hasFotos) return null;

  return (
    <div className={`mt-6 pt-6 border-t ${isDark ? 'border-white/10' : 'border-gray-150'}`}>
      {/* Portfolio Link Button */}
      {hasLink && (
        <div className="mb-5 text-center">
          <a
            href={portfolioLink}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm hover:shadow active:scale-98 ${
              isDark
                ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white hover:from-emerald-700 hover:to-teal-650'
                : 'bg-gradient-to-r from-blue-600 to-indigo-650 text-white hover:from-blue-700 hover:to-indigo-700'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Ver Portfólio Completo</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-80" />
          </a>
        </div>
      )}

      {/* Showcase Photos Grid */}
      {hasFotos && (
        <div className="space-y-3">
          <p className={`text-xs font-bold uppercase tracking-wider text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            📸 Portfólio de Destaque
          </p>
          <div className="grid grid-cols-3 gap-3 max-w-md mx-auto px-2">
            {portfolioFotos.map((fotoUrl, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedImage(fotoUrl)}
                className={`relative aspect-video rounded-lg overflow-hidden cursor-pointer group shadow border transition-all hover:-translate-y-0.5 hover:shadow-md ${
                  isDark ? 'border-white/10' : 'border-gray-200'
                }`}
              >
                <img
                  src={fotoUrl}
                  alt={`Destaque ${idx + 1}`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Eye className="w-4 h-4 text-white" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[200] flex items-center justify-center p-4 cursor-pointer animate-fade-in"
        >
          <div className="relative max-w-5xl max-h-[90vh]">
            <img
              src={selectedImage}
              alt="Portfólio em tamanho cheio"
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
