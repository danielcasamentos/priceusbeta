import { useState, useEffect } from 'react';
import { Download, Calendar, Camera, Loader2, Sparkles, Heart, Check, CheckCircle2, ShoppingBag } from 'lucide-react';
import { Gallery, GalleryPhoto } from '../../types/gallery';
import { GalleryService } from '../../services/galleryService';
import { convertWebpToLowResJpeg } from '../../services/galleryImageProcessor';
import { GalleryPasswordModal } from './GalleryPasswordModal';
import { GalleryLightbox } from './GalleryLightbox';
import { GalleryLeadCaptureModal } from './GalleryLeadCaptureModal';
import { GalleryProofingCheckoutModal } from './GalleryProofingCheckoutModal';
import { GallerySocialPromoModal } from './GallerySocialPromoModal';

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
  const [visitorLead, setVisitorLead] = useState<{ name: string; email: string; whatsapp: string } | null>(() => {
    const saved = sessionStorage.getItem(`gallery_visitor_${gallery.id}`);
    return saved ? JSON.parse(saved) : null;
  });
  const [showLeadModal, setShowLeadModal] = useState(false);

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);

  // Seleção de fotos pelo cliente (Proofing)
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [showProofingCheckout, setShowProofingCheckout] = useState(false);

  // Social promo modal ao baixar fotos
  const [showSocialPromo, setShowSocialPromo] = useState(false);

  // Verificar autorização de senha e exibição do Lead capture
  useEffect(() => {
    if (gallery.password_hash) {
      const sessionAuth = sessionStorage.getItem(`gallery_auth_${gallery.id}`);
      if (sessionAuth === 'true') {
        setIsAuthorized(true);
      }
    }
  }, [gallery.id, gallery.password_hash]);

  useEffect(() => {
    if (isAuthorized && gallery.require_lead_capture && !visitorLead) {
      setShowLeadModal(true);
    }
  }, [isAuthorized, gallery.require_lead_capture, visitorLead]);

  const handleVerifyPassword = async (password: string): Promise<boolean> => {
    const isValid = await GalleryService.verifyGalleryPassword(gallery, password);
    if (isValid) {
      setIsAuthorized(true);
      sessionStorage.setItem(`gallery_auth_${gallery.id}`, 'true');
      return true;
    }
    return false;
  };

  const handleSubmitLead = async (data: { name: string; email: string; whatsapp: string }) => {
    setVisitorLead(data);
    sessionStorage.setItem(`gallery_visitor_${gallery.id}`, JSON.stringify(data));
    setShowLeadModal(false);
    await GalleryService.registerVisitor(gallery.id, data);
  };

  const toggleSelectPhoto = (photoId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedPhotoIds((prev) =>
      prev.includes(photoId) ? prev.filter((id) => id !== photoId) : [...prev, photoId]
    );
  };

  const handleDownloadSinglePhoto = async (photo: GalleryPhoto, highRes: boolean) => {
    if (gallery.enable_social_promo && gallery.photographer_instagram) {
      setShowSocialPromo(true);
    }

    try {
      const rawName = photo.file_name || 'foto';
      const baseName = rawName.replace(/\.(webp|png|jpeg|jpg)$/i, '');

      if (highRes) {
        const a = document.createElement('a');
        a.href = photo.supabase_web_path;
        a.download = `${baseName}.jpg`;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
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
    if (gallery.enable_social_promo && gallery.photographer_instagram) {
      setShowSocialPromo(true);
    }

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

  const selectedPhotos = photos.filter((p) => selectedPhotoIds.includes(p.id));
  const packageLimit = gallery.package_photo_limit || 0;
  const extraCalc = GalleryService.calculateExtraPhotosPrice(gallery, selectedPhotoIds.length);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-slate-900 selection:text-white relative pb-24">
      {/* Modal de Senha */}
      {!isAuthorized && (
        <GalleryPasswordModal
          isOpen={!isAuthorized}
          galleryTitle={gallery.title}
          photographerName={photographer.nome_profissional}
          onVerifyPassword={handleVerifyPassword}
        />
      )}

      {/* Modal de Captura de Lead */}
      {isAuthorized && showLeadModal && (
        <GalleryLeadCaptureModal
          isOpen={showLeadModal}
          galleryTitle={gallery.title}
          photographerName={photographer.nome_profissional}
          onSubmitLead={handleSubmitLead}
        />
      )}

      {/* Modal de Divulgação Social Instagram */}
      <GallerySocialPromoModal
        isOpen={showSocialPromo}
        onClose={() => setShowSocialPromo(false)}
        instagramHandle={gallery.photographer_instagram}
        photographerName={photographer.nome_profissional}
      />

      {/* Modal de Fechamento de Pacote / Checkout de Extras */}
      <GalleryProofingCheckoutModal
        isOpen={showProofingCheckout}
        onClose={() => setShowProofingCheckout(false)}
        gallery={gallery}
        selectedPhotos={selectedPhotos}
        visitorName={visitorLead?.name}
        onConfirmSelection={() => {
          alert('Sua escolha foi aprovada e enviada com sucesso ao fotógrafo! 🎉');
        }}
      />

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

          {/* Grid Masonry de Fotos com Fundo Branco Limpo e botão de Seleção de Proofing */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 bg-white">
            {photos.length === 0 ? (
              <div className="text-center py-20 border border-slate-200 rounded-3xl bg-slate-50/50">
                <Sparkles className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-600 text-base font-semibold">Galeria sem fotos disponíveis no momento.</p>
              </div>
            ) : (
              <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-5 space-y-5">
                {photos.map((photo, index) => {
                  const isSelected = selectedPhotoIds.includes(photo.id);
                  return (
                    <div
                      key={photo.id}
                      onClick={() => setLightboxIndex(index)}
                      className={`break-inside-avoid relative group rounded-2xl overflow-hidden cursor-pointer bg-slate-100 border transition-all duration-300 shadow-sm hover:shadow-xl ${
                        isSelected ? 'ring-4 ring-emerald-500 border-emerald-500' : 'border-slate-200/70 hover:border-slate-400'
                      }`}
                    >
                      <img
                        src={photo.supabase_web_path || photo.supabase_thumb_path}
                        alt={photo.file_name || `Foto ${index + 1}`}
                        className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />

                      {/* Badge de Seleção no topo da foto */}
                      <button
                        onClick={(e) => toggleSelectPhoto(photo.id, e)}
                        className={`absolute top-3 right-3 z-20 p-2 rounded-full transition-all shadow-lg ${
                          isSelected
                            ? 'bg-emerald-500 text-slate-950 scale-110'
                            : 'bg-black/50 hover:bg-black/80 text-white backdrop-blur-md'
                        }`}
                        title={isSelected ? 'Remover da Seleção' : 'Selecionar Foto'}
                      >
                        {isSelected ? <Check className="w-4 h-4 stroke-[3]" /> : <Heart className="w-4 h-4" />}
                      </button>

                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 flex items-end justify-between">
                        <span className="text-xs text-white font-semibold truncate">{photo.file_name}</span>
                        <span className="p-2 rounded-xl bg-white/20 backdrop-blur-md text-white hover:bg-white/40 transition-colors">
                          <Download className="w-4 h-4" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>

          {/* Barra Flutuante de Seleção / Proofing no Rodapé */}
          {selectedPhotoIds.length > 0 && (
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-slate-950/90 border border-slate-800 backdrop-blur-xl text-white rounded-3xl px-6 py-3.5 shadow-2xl flex items-center gap-4 sm:gap-6 animate-in slide-in-from-bottom duration-300 max-w-[92vw] sm:max-w-xl">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{selectedPhotoIds.length} foto(s) selecionada(s)</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {packageLimit > 0 ? (
                    selectedPhotoIds.length <= packageLimit ? (
                      `Dentro da cota de ${packageLimit} fotos inclusas`
                    ) : (
                      <span className="text-amber-400 font-bold">
                        +{extraCalc.extraCount} extra(s) (R$ {extraCalc.totalPrice.toFixed(2)})
                      </span>
                    )
                  ) : (
                    'Sem limite de fotos'
                  )}
                </p>
              </div>

              <button
                onClick={() => setShowProofingCheckout(true)}
                className="px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5 shrink-0"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Aprovar Escolha</span>
              </button>
            </div>
          )}

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
