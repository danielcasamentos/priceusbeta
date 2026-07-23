import { useState, useEffect } from 'react';
import { Download, Calendar, Camera, Loader2, Sparkles } from 'lucide-react';
import { Gallery, GalleryPhoto } from '../../types/gallery';
import { GalleryService } from '../../services/galleryService';
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

  const handleDownloadSinglePhoto = (photo: GalleryPhoto, _highRes: boolean) => {
    const a = document.createElement('a');
    a.href = photo.supabase_web_path;
    a.download = photo.file_name || 'foto.webp';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500 selection:text-white">
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
          <div className="relative w-full h-[40vh] sm:h-[50vh] overflow-hidden bg-slate-900">
            {gallery.cover_photo_url ? (
              <img
                src={gallery.cover_photo_url}
                alt={gallery.title}
                className="w-full h-full object-cover brightness-[0.6] filter contrast-105 transition-transform duration-700 hover:scale-105"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950/40 opacity-90" />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

            <div className="absolute bottom-0 left-0 right-0 max-w-7xl mx-auto p-6 sm:p-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-3">
                {/* Branding do Fotógrafo */}
                <div className="flex items-center space-x-3">
                  {photographer.profile_image_url ? (
                    <img
                      src={photographer.profile_image_url}
                      alt={photographer.nome_profissional || 'Fotógrafo'}
                      className="w-10 h-10 rounded-full border-2 border-white/20 object-cover shadow-lg"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-lg">
                      <Camera className="w-5 h-5" />
                    </div>
                  )}
                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-300 font-semibold">Fotografia por</p>
                    <a
                      href={`/${photographer.slug || ''}`}
                      className="text-sm font-bold text-white hover:text-blue-400 transition-colors"
                    >
                      {photographer.nome_profissional || 'Fotógrafo PriceU$'}
                    </a>
                  </div>
                </div>

                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
                  {gallery.title}
                </h1>

                {gallery.event_date && (
                  <p className="text-xs sm:text-sm text-slate-300 flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-blue-400" />
                    <span>{new Date(gallery.event_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                  </p>
                )}
              </div>

              {/* Botão Baixar Fotos em Lote (ZIP) */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleDownloadZip}
                  disabled={downloadingZip || photos.length === 0}
                  className="px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-xl shadow-blue-500/25 transition-all flex items-center space-x-2 disabled:opacity-50"
                >
                  {downloadingZip ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Gerando ZIP ({zipProgress}%)...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Baixar Galeria Completa (ZIP)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Grid Masonry de Fotos */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            {photos.length === 0 ? (
              <div className="text-center py-20 border border-slate-900 rounded-3xl bg-slate-900/30">
                <Sparkles className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 text-base font-semibold">Galeria sem fotos disponíveis no momento.</p>
              </div>
            ) : (
              <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
                {photos.map((photo, index) => (
                  <div
                    key={photo.id}
                    onClick={() => setLightboxIndex(index)}
                    className="break-inside-avoid relative group rounded-2xl overflow-hidden cursor-pointer bg-slate-900 border border-slate-900 hover:border-slate-700 transition-all duration-300 shadow-md"
                  >
                    <img
                      src={photo.supabase_web_path || photo.supabase_thumb_path}
                      alt={photo.file_name || `Foto ${index + 1}`}
                      className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 flex items-end justify-between">
                      <span className="text-xs text-white font-medium truncate">{photo.file_name}</span>
                      <span className="p-2 rounded-xl bg-white/10 backdrop-blur-md text-white">
                        <Download className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>

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
