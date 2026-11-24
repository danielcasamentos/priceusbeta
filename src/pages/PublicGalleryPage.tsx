import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { GalleryService } from '../services/galleryService';
import { Gallery, GalleryPhoto } from '../types/gallery';
import { PublicGalleryView } from '../components/gallery/PublicGalleryView';
import { Loader2, AlertCircle } from 'lucide-react';

export function PublicGalleryPage() {
  const params = useParams<{ slugUsuario?: string; slugGaleria?: string; slug?: string }>();
  const gallerySlug = params.slugGaleria || params.slug;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    gallery: Gallery;
    photos: GalleryPhoto[];
    photographer: { nome_profissional?: string; profile_image_url?: string; slug?: string };
  } | null>(null);

  useEffect(() => {
    if (!gallerySlug) return;
    setLoading(true);
    GalleryService.getPublicGalleryBySlug(gallerySlug)
      .then((res) => {
        setData(res);
        if (res?.gallery) {
          document.title = `${res.gallery.title} | ${res.photographer.nome_profissional || 'Galeria PriceU$'}`;
        }
      })
      .catch((err) => console.error('Erro ao carregar galeria pública:', err))
      .finally(() => setLoading(false));
  }, [gallerySlug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-400">Carregando galeria...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
          <h1 className="text-xl font-bold text-white">Galeria não encontrada</h1>
          <p className="text-xs text-slate-400">
            A galeria solicitada não existe, está arquivada ou o link é inválido.
          </p>
        </div>
      </div>
    );
  }

  return (
    <PublicGalleryView
      gallery={data.gallery}
      photos={data.photos}
      photographer={data.photographer}
    />
  );
}
