import React, { useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { GalleryPhoto } from '../../types/gallery';
import { SmartGalleryImage } from './SmartGalleryImage';

interface GalleryLightboxProps {
  photos: GalleryPhoto[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (index: number) => void;
  allowLowResDownload?: boolean;
  allowHighResDownload?: boolean;
  onDownloadPhoto?: (photo: GalleryPhoto, highRes: boolean) => void;
  watermarkEnabled?: boolean;
  watermarkType?: 'text' | 'image' | null;
  watermarkText?: string | null;
  watermarkLogoUrl?: string | null;
  watermarkPosition?: string | null;
  watermarkOpacity?: number | null;
  watermarkScale?: number | null;
  watermarkRotation?: number | null;
}

export function GalleryLightbox({
  photos,
  currentIndex,
  isOpen,
  onClose,
  onNavigate,
  allowLowResDownload = true,
  allowHighResDownload = true,
  onDownloadPhoto,
  watermarkEnabled = false,
  watermarkType = 'text',
  watermarkText,
  watermarkLogoUrl,
  watermarkPosition = 'bottom-right',
  watermarkOpacity = 0.7,
  watermarkScale = 0.18,
  watermarkRotation = 0,
}: GalleryLightboxProps) {
  const currentPhoto = photos[currentIndex];
  const touchStartX = useRef<number | null>(null);

  // Pré-carregamento em background das próximas fotos e da anterior para transição instantânea (0ms)
  useEffect(() => {
    if (!isOpen || currentIndex < 0) return;
    const indicesToPreload = [currentIndex + 1, currentIndex + 2, currentIndex - 1].filter(
      (idx) => idx >= 0 && idx < photos.length
    );

    indicesToPreload.forEach((idx) => {
      const p = photos[idx];
      if (p) {
        const url =
          p.supabase_web_path ||
          (p.google_drive_file_id ? `https://lh3.googleusercontent.com/d/${p.google_drive_file_id}=w1600` : null) ||
          p.supabase_thumb_path;
        if (url) {
          const img = new Image();
          img.src = url;
        }
      }
    });
  }, [isOpen, currentIndex, photos]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && currentIndex > 0) onNavigate(currentIndex - 1);
      if (e.key === 'ArrowRight' && currentIndex < photos.length - 1) onNavigate(currentIndex + 1);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, photos.length]);

  if (!isOpen || !currentPhoto) return null;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentIndex < photos.length - 1) {
        onNavigate(currentIndex + 1); // Swipe left -> proxima
      } else if (diff < 0 && currentIndex > 0) {
        onNavigate(currentIndex - 1); // Swipe right -> anterior
      }
    }
    touchStartX.current = null;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-md select-none animate-in fade-in duration-200"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Botão Fechar */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 p-3 rounded-full bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Navegação Esquerda */}
      {currentIndex > 0 && (
        <button
          onClick={() => onNavigate(currentIndex - 1)}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-slate-900/80 text-white hover:bg-slate-800 transition-colors shadow-lg cursor-pointer"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {/* Navegação Direita */}
      {currentIndex < photos.length - 1 && (
        <button
          onClick={() => onNavigate(currentIndex + 1)}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-slate-900/80 text-white hover:bg-slate-800 transition-colors shadow-lg cursor-pointer"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Imagem lightbox */}
      <div className="max-w-7xl max-h-[85vh] p-2 sm:p-4 flex flex-col items-center justify-center relative">
        <div className="relative inline-flex items-center justify-center overflow-hidden rounded-lg max-h-[78vh] max-w-full">
          <SmartGalleryImage
            photo={currentPhoto}
            src={currentPhoto.supabase_web_path || currentPhoto.supabase_thumb_path}
            preferThumbnail={false}
            alt={currentPhoto.file_name || 'Foto em tela cheia'}
            className="max-w-full max-h-[78vh] w-auto h-auto object-contain rounded-lg shadow-2xl block"
            objectFit="contain"
          />

          {/* Marca d'água no Lightbox adaptada a Paisagem e Retrato */}
          {watermarkEnabled && (() => {
            const pos = watermarkPosition || 'bottom-right';
            const alignMap: Record<string, string> = {
              'top-left':      'items-start justify-start',
              'top-center':    'items-start justify-center',
              'top-right':     'items-start justify-end',
              'center-left':   'items-center justify-start',
              'center':        'items-center justify-center',
              'center-right':  'items-center justify-end',
              'bottom-left':   'items-end justify-start',
              'bottom-center': 'items-end justify-center',
              'bottom-right':  'items-end justify-end',
            };
            const align = alignMap[pos] ?? 'items-end justify-end';
            const rot = watermarkRotation ?? 0;
            const op = watermarkOpacity !== null && watermarkOpacity !== undefined ? watermarkOpacity : 0.7;
            const sc = watermarkScale !== null && watermarkScale !== undefined ? watermarkScale : 0.18;

            return (
              <div className={`absolute inset-0 pointer-events-none select-none flex ${align} p-4 sm:p-6 z-10 overflow-hidden`}>
                {watermarkLogoUrl && watermarkType === 'image' ? (
                  <img
                    src={watermarkLogoUrl}
                    alt="Marca d'água"
                    style={{
                      transform: `rotate(${rot}deg)`,
                      opacity: op,
                      maxWidth: `${Math.min(60, Math.max(10, sc * 100))}%`,
                      maxHeight: `${Math.min(60, Math.max(10, sc * 100))}%`,
                    }}
                    className="object-contain filter drop-shadow-md pointer-events-none"
                  />
                ) : (
                  <div
                    style={{
                      transform: `rotate(${rot}deg)`,
                      opacity: op,
                      fontSize: `clamp(11px, ${Math.max(11, sc * 90)}px, 24px)`,
                    }}
                    className="text-center text-white font-extrabold tracking-widest uppercase border border-white/30 px-3.5 py-1.5 rounded-xl bg-black/40 backdrop-blur-[2px] shadow-lg pointer-events-none whitespace-nowrap"
                  >
                    © {watermarkText || 'DIREITOS RESERVADOS'}
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Rodapé de Informações e Download */}
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 w-full max-w-2xl px-4 py-3 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
          <div className="flex items-center space-x-3 text-xs text-slate-300 truncate">
            <span className="font-bold text-white bg-slate-800 px-2.5 py-1 rounded-md">
              {currentIndex + 1} / {photos.length}
            </span>
            <span className="truncate max-w-[200px]">{currentPhoto.file_name}</span>
          </div>

          <div className="flex items-center space-x-2">
            {allowLowResDownload && (
              <button
                onClick={() => onDownloadPhoto && onDownloadPhoto(currentPhoto, false)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors flex items-center space-x-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar Web</span>
              </button>
            )}

            {allowHighResDownload && (
              <button
                onClick={() => onDownloadPhoto && onDownloadPhoto(currentPhoto, true)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center space-x-1.5 shadow-md shadow-blue-500/20"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Alta Resolução</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
