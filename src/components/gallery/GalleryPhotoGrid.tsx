import { Star, Trash2, Image as ImageIcon } from 'lucide-react';
import { GalleryPhoto } from '../../types/gallery';

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

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {photos.map((photo) => {
        const isCover = photo.id === coverPhotoId;

        return (
          <div
            key={photo.id}
            className={`group relative rounded-xl overflow-hidden bg-slate-900 border transition-all duration-200 ${
              isCover ? 'border-amber-500 shadow-lg shadow-amber-500/10' : 'border-slate-800 hover:border-slate-700'
            }`}
          >
            {/* Imagem Thumbnail */}
            <div className="aspect-square bg-slate-950 overflow-hidden relative">
              <img
                src={photo.supabase_thumb_path || photo.supabase_web_path}
                alt={photo.file_name || 'Foto'}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />

              {/* Badge de Capa */}
              {isCover && (
                <div className="absolute top-2 left-2 bg-amber-500 text-slate-950 font-bold text-[10px] px-2 py-0.5 rounded-md flex items-center space-x-1 shadow-md">
                  <Star className="w-3 h-3 fill-slate-950" />
                  <span>CAPA DA GALERIA</span>
                </div>
              )}

              {/* Overlay de Ações no Hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-3">
                <div className="flex justify-end">
                  <button
                    onClick={() => onDeletePhoto(photo.id)}
                    title="Excluir Foto"
                    className="p-1.5 rounded-lg bg-red-500/80 text-white hover:bg-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1.5">
                  {!isCover && (
                    <button
                      onClick={() => onSetCoverPhoto(photo)}
                      className="w-full py-1.5 rounded-lg bg-amber-500/90 text-slate-950 text-xs font-bold hover:bg-amber-400 transition-colors flex items-center justify-center space-x-1"
                    >
                      <Star className="w-3.5 h-3.5" />
                      <span>Definir como Capa</span>
                    </button>
                  )}

                  <p className="text-[10px] text-slate-300 truncate">{photo.file_name}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
