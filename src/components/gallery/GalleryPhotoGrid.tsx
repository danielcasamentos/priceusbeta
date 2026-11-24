import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Star, Trash2, Image as ImageIcon, Loader2, ArrowUpDown, Clock, ArrowDownAZ } from 'lucide-react';
import { GalleryPhoto } from '../../types/gallery';
import { SmartGalleryImage } from './SmartGalleryImage';
import { PhotoSortMode, sortGalleryPhotos } from '../../utils/photoSorter';

interface GalleryPhotoGridProps {
  photos: GalleryPhoto[];
  coverPhotoId?: string | null;
  onSetCoverPhoto: (photo: GalleryPhoto) => Promise<void>;
  onDeletePhoto: (photoId: string) => Promise<void>;
}

export function GalleryPhotoGrid({
  photos,
  coverPhotoId,
  onSetCoverPhoto,
  onDeletePhoto,
}: GalleryPhotoGridProps) {
  const [sortMode, setSortMode] = useState<PhotoSortMode>('capture_asc');
  const [visibleCount, setVisibleCount] = useState(72);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Fotos ordenadas de acordo com o modo escolhido
  const sortedPhotos = useMemo(() => {
    return sortGalleryPhotos(photos, sortMode);
  }, [photos, sortMode]);

  useEffect(() => {
    setVisibleCount(72);
  }, [photos.length, sortMode]);

  useEffect(() => {
    const currentSentinel = sentinelRef.current;
    if (!currentSentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => prev + 72);
        }
      },
      { rootMargin: '600px' }
    );

    observer.observe(currentSentinel);
    return () => observer.disconnect();
  }, [photos.length, visibleCount, sortMode]);

  if (!photos || photos.length === 0) {
    return (
      <div className="p-12 text-center border border-slate-800 rounded-2xl bg-slate-900/30 space-y-3">
        <div className="p-3 w-12 h-12 rounded-2xl bg-slate-800 text-slate-500 mx-auto flex items-center justify-center">
          <ImageIcon className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-slate-400">Nenhuma foto enviada para esta galeria ainda</p>
        <p className="text-xs text-slate-500">Utilize a área de upload acima para enviar fotos em lote.</p>
      </div>
    );
  }

  const displayedPhotos = sortedPhotos.slice(0, visibleCount);

  return (
    <div className="space-y-4">
      {/* Barra de Ordenação */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 px-4 py-2.5 rounded-xl border border-slate-800/80">
        <div className="flex items-center space-x-2 text-xs text-slate-400">
          <ArrowUpDown className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-medium">Ordenar por:</span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setSortMode('capture_asc')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
              sortMode === 'capture_asc'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Hora da Captura (Cerimônia ➔ Festa)</span>
          </button>

          <button
            type="button"
            onClick={() => setSortMode('capture_desc')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
              sortMode === 'capture_desc'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <Clock className="w-3.5 h-3.5 rotate-180" />
            <span>Mais Recente Primeiro</span>
          </button>

          <button
            type="button"
            onClick={() => setSortMode('name_asc')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
              sortMode === 'name_asc'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <ArrowDownAZ className="w-3.5 h-3.5" />
            <span>Nome do Arquivo (A-Z)</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9 gap-1.5">
        {displayedPhotos.map((photo) => {
          const isCover = photo.id === coverPhotoId;

          return (
            <div
              key={photo.id}
              className={`group relative rounded-none overflow-hidden bg-slate-900 border transition-all duration-200 ${
                isCover ? 'border-amber-500 shadow-lg shadow-amber-500/10' : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Imagem Thumbnail */}
              <div className="aspect-square bg-slate-950 overflow-hidden relative rounded-none">
                <SmartGalleryImage
                  photo={photo}
                  preferThumbnail={true}
                  alt={photo.file_name || 'Foto'}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 rounded-none"
                />

                {/* Badge de Capa */}
                {isCover && (
                  <div className="absolute top-2 left-2 bg-amber-500 text-slate-950 font-bold text-[10px] px-2 py-0.5 rounded-none flex items-center space-x-1 shadow-md">
                    <Star className="w-3 h-3 fill-slate-950" />
                    <span>CAPA</span>
                  </div>
                )}

                {/* Overlay de Ações no Hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-2">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => onDeletePhoto(photo.id)}
                      title="Excluir Foto"
                      className="p-1 rounded-lg bg-red-500/80 text-white hover:bg-red-600 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    {!isCover && (
                      <button
                        type="button"
                        onClick={() => onSetCoverPhoto(photo)}
                        className="w-full py-1 rounded-lg bg-amber-500/90 text-slate-950 text-[10px] font-bold hover:bg-amber-400 transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                      >
                        <Star className="w-3 h-3" />
                        <span>Definir Capa</span>
                      </button>
                    )}

                    <p className="text-[9px] text-slate-300 truncate">{photo.file_name}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {visibleCount < photos.length && (
        <div ref={sentinelRef} className="py-6 text-center flex items-center justify-center space-x-2 text-xs text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
          <span>Carregando mais fotos da galeria ({visibleCount}/{photos.length})...</span>
        </div>
      )}
    </div>
  );
}
