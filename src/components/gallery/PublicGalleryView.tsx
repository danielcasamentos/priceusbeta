import { useState, useEffect } from 'react';
import { Download, Calendar, Camera, Loader2, Sparkles } from 'lucide-react';
import { Gallery, GalleryPhoto } from '../../types/gallery';
import { GalleryService } from '../../services/galleryService';
import { convertWebpToLowResJpeg } from '../../services/galleryImageProcessor';
import { GalleryPasswordModal } from './GalleryPasswordModal';
import { GalleryLightbox } from './GalleryLightbox';

interface PublicGalleryViewProps {
  gallery: Gallery;
  photos: GalleryPhoto[];
  photographer: { nome_profissional?: string; profile_image_url?: string; slug?: string };
}

export function PublicGalleryView({
  gallery,
  photos,
  photographer,
}: PublicGalleryViewProps) {
  const [isAuthorized, setIsAuthorized] = useState(!gallery.password_hash);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);

  // Verificar se o usuário já autenticou nesta sessão
  useEffect(() => {
    if (gallery.password_hash) {
      const sessionAuth = sessionStorage.getItem(`gallery_auth_${gallery.id}`);
      if (sessionAuth === 'true') {
        setIsAuthorized(true);
      }
    }
  }, [gallery.id, gallery.password_hash]);

  const handleVerifyPassword = async (password: string): Promise<boolean> => {
    const isValid = await GalleryService.verifyGalleryPassword(gallery, password);
    if (isValid) {
      setIsAuthorized(true);
      sessionStorage.setItem(`gallery_auth_${gallery.id}`, 'true');
      return true;
    }
    return false;
  };

  const handleDownloadSinglePhoto = async (photo: GalleryPhoto, highRes: boolean) => {
    try {
      const rawName = photo.file_name || 'foto';
      const baseName = rawName.replace(/\.(webp|png|jpeg|jpg)$/i, '');

      if (highRes) {
        // Se for Alta Resolução, abrir/baixar a URL original sem modificação
        const a = document.createElement('a');
        a.href = photo.supabase_web_path;
        a.download = `${baseName}.jpg`;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        // Baixa Resolução: Converter WebP para JPEG de 1920px (96 DPI) em memória
        const jpegBlob = await convertWebpToLowResJpeg(
          photo.supabase_web_path || photo.supabase_thumb_path,
          1920,
          0.88
        );
        const blobUrl = URL.createObjectURL(jpegBlob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `${baseName}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      }
    } catch (err) {
      console.error('Erro ao baixar foto:', err);
      window.open(photo.supabase_web_path, '_blank');
    }
  };

  const handleDownloadZip = async () => {
    setDownloadingZip(true);
    setZipProgress(0);
    try {
      const zipBlob = await GalleryService.generateGalleryZip(
        gallery.title,
        photos,
        gallery.allow_high_res_download,
        null,
        (percent) => setZipProgress(percent)
      );

      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${gallery.slug}_fotos.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao gerar arquivo ZIP:', err);
    } finally {
      setDownloadingZip(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-slate-900 selection:text-white">
      {/* Modal de Senha */}
      {!isAuthorized && (
        <GalleryPasswordModal
          isOpen={!isAuthorized}
          galleryTitle={gallery.title}
          photographerName={photographer.nome_profissional}
          onVerifyPassword={handleVerifyPassword}
        />
      )}

      {isAuthorized && (
        <>
          {/* Header de Capa & Branding do Fotógrafo */}
          <div className="relative w-full h-[45vh] sm:h-[55vh] overflow-hidden bg-slate-900">
            {gallery.cover_photo_url ? (
              <img
                src={gallery.cover_photo_url}
                alt={gallery.title}
                className="w-full h-full object-cover brightness-[0.7] filter contrast-105 transition-transform duration-700 hover:scale-105"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950" />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

            <div className="absolute bottom-0 left-0 right-0 max-w-7xl mx-auto p-6 sm:p-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-3">
                {/* Branding do Fotógrafo */}
                <div className="flex items-center space-x-3">
                  {photographer.profile_image_url ? (
                    <img
                      src={photographer.profile_image_url}
                      alt={photographer.nome_profissional || 'Fotógrafo'}
                      className="w-11 h-11 rounded-full border-2 border-white/40 object-cover shadow-lg"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-white text-slate-900 flex items-center justify-center font-bold text-sm shadow-lg">
                      <Camera className="w-5 h-5 text-slate-900" />
                    </div>
                  )}
                  <div>
                    <p className="text-xs uppercase tracking-widest text-slate-300 font-semibold">Fotografia por</p>
                    <a
                      href={`/${photographer.slug || ''}`}
                      className="text-sm font-bold text-white hover:text-emerald-400 transition-colors"
                    >
                      {photographer.nome_profissional || 'Fotógrafo PriceU$'}
                    </a>
                  </div>
                </div>

                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight drop-shadow-md">
                  {gallery.title}
                </h1>

                {gallery.event_date && (
                  <p className="text-xs sm:text-sm text-slate-200 flex items-center space-x-2 font-medium">
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    <span>{new Date(gallery.event_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                  </p>
                )}
              </div>

              {/* Botão Baixar Fotos em Lote (ZIP) */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleDownloadZip}
                  disabled={downloadingZip || photos.length === 0}
                  className="px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-100 text-slate-950 font-bold text-sm shadow-2xl transition-all flex items-center space-x-2 disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
                >
                  {downloadingZip ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      <span>Gerando ZIP ({zipProgress}%)...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 text-slate-950" />
                      <span>Baixar Galeria Completa (ZIP)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Grid Masonry de Fotos com Fundo Branco Limpo */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 bg-white">
            {photos.length === 0 ? (
              <div className="text-center py-20 border border-slate-200 rounded-3xl bg-slate-50/50">
                <Sparkles className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-600 text-base font-semibold">Galeria sem fotos disponíveis no momento.</p>
              </div>
            ) : (
              <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-5 space-y-5">
                {photos.map((photo, index) => (
                  <div
                    key={photo.id}
                    onClick={() => setLightboxIndex(index)}
                    className="break-inside-avoid relative group rounded-2xl overflow-hidden cursor-pointer bg-slate-100 border border-slate-200/70 hover:border-slate-400 transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-0.5"
                  >
                    <img
                      src={photo.supabase_web_path || photo.supabase_thumb_path}
                      alt={photo.file_name || `Foto ${index + 1}`}
                      className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 flex items-end justify-between">
                      <span className="text-xs text-white font-semibold truncate">{photo.file_name}</span>
                      <span className="p-2 rounded-xl bg-white/20 backdrop-blur-md text-white hover:bg-white/40 transition-colors">
                        <Download className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>

          {/* Rodapé Clean */}
          <footer className="border-t border-slate-100 py-8 bg-slate-50/60 text-center text-xs text-slate-400">
            <p>Galeria entregue via <span className="font-bold text-slate-700">PriceU$</span></p>
          </footer>

          {/* Lightbox */}
          <GalleryLightbox
            photos={photos}
            currentIndex={lightboxIndex || 0}
            isOpen={lightboxIndex !== null}
            onClose={() => setLightboxIndex(null)}
            onNavigate={(index) => setLightboxIndex(index)}
            allowLowResDownload={gallery.allow_low_res_download}
            allowHighResDownload={gallery.allow_high_res_download}
            onDownloadPhoto={handleDownloadSinglePhoto}
          />
        </>
      )}
    </div>
  );
}
