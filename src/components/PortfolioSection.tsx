import { useState } from 'react';
import { Globe, ExternalLink, Eye, X, Images, Calendar } from 'lucide-react';

interface PortfolioSectionProps {
  portfolioLink?: string | null;
  portfolioFotos?: string[] | null;
  galleries?: {
    id: string;
    title: string;
    slug: string;
    cover_photo_url?: string | null;
    event_date?: string | null;
  }[];
  photographerSlug?: string;
  isDark?: boolean;
}

export function PortfolioSection({
  portfolioLink,
  portfolioFotos,
  galleries = [],
  photographerSlug = '',
  isDark = false,
}: PortfolioSectionProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const hasLink = !!portfolioLink;
  const hasFotos = !!portfolioFotos && portfolioFotos.length > 0;
  const hasGalleries = !!galleries && galleries.length > 0;

  if (!hasLink && !hasFotos && !hasGalleries) return null;

  return (
    <div className={`mt-8 pt-6 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
      {/* Seção de Galerias de Entregas Reais (Portfólio Público) */}
      {hasGalleries && (
        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-center space-x-2">
            <Images className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-blue-600'}`} />
            <h3 className={`text-xs font-bold uppercase tracking-wider text-center ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Portfólio de Entregas Reais
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl mx-auto px-2">
            {galleries.map((gallery) => (
              <a
                key={gallery.id}
                href={`/${photographerSlug}/g/${gallery.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`group relative rounded-2xl overflow-hidden shadow-md border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col justify-between ${
                  isDark ? 'bg-[#0f172a] border-white/10 hover:border-emerald-500/50' : 'bg-white border-gray-200 hover:border-blue-400'
                }`}
              >
                {/* Imagem de Capa */}
                <div className="aspect-[4/3] bg-gray-100 dark:bg-slate-900 overflow-hidden relative">
                  {gallery.cover_photo_url ? (
                    <img
                      src={gallery.cover_photo_url}
                      alt={gallery.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 dark:text-slate-600">
                      <Images className="w-8 h-8 mb-1 opacity-50" />
                      <span className="text-[10px]">Ver Galeria</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                    <span className="text-xs text-white font-bold flex items-center space-x-1">
                      <span>Ver Fotos</span>
                      <ExternalLink className="w-3 h-3" />
                    </span>
                  </div>
                </div>

                {/* Detalhes do Evento */}
                <div className="p-3 text-left space-y-1">
                  <p className={`text-xs font-bold leading-snug truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {gallery.title}
                  </p>
                  {gallery.event_date && (
                    <p className={`text-[10px] flex items-center space-x-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      <Calendar className="w-3 h-3 text-blue-500" />
                      <span>{new Date(gallery.event_date).toLocaleDateString('pt-BR')}</span>
                    </p>
                  )}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Portfolio Link External Button */}
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
            <span>Ver Portfólio Externo</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-80" />
          </a>
        </div>
      )}

      {/* Showcase Photos Grid (Fotos Estáticas de Destaque) */}
      {hasFotos && (
        <div className="space-y-3">
          <p className={`text-xs font-bold uppercase tracking-wider text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            📸 Fotos em Destaque
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

