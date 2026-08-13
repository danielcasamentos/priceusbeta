import { useState, useEffect } from 'react';
import { Download, Calendar, Camera, Loader2, Sparkles, Heart, Check, CheckCircle2, ShoppingBag, ShieldCheck, FileText, Lock, X } from 'lucide-react';
import { Gallery, GalleryPhoto } from '../../types/gallery';
import { GalleryService } from '../../services/galleryService';
import { convertWebpToLowResJpeg } from '../../services/galleryImageProcessor';
import { applyWatermarkToImage } from '../../services/watermarkService';
import { GalleryPasswordModal } from './GalleryPasswordModal';
import { GalleryLightbox } from './GalleryLightbox';
import { GalleryLeadCaptureModal } from './GalleryLeadCaptureModal';
import { GalleryProofingCheckoutModal } from './GalleryProofingCheckoutModal';
import { GallerySocialPromoModal } from './GallerySocialPromoModal';
import { GalleryUsagePolicyModal } from './GalleryUsagePolicyModal';
import { SmartGalleryImage } from './SmartGalleryImage';

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

  // Seleção de subgalerias / abas de álbuns (ex: Pré-Casamento vs Casamento)
  const [activeSubgallery, setActiveSubgallery] = useState<string>('all');

  // Seleção de fotos pelo cliente (Proofing)
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [showProofingCheckout, setShowProofingCheckout] = useState(false);

  // Social promo modal ao baixar fotos
  const [showSocialPromo, setShowSocialPromo] = useState(false);

  // Modal de Política de Liberação de Imagem
  const [showUsagePolicyModal, setShowUsagePolicyModal] = useState(false);
  const [pendingDownloadAction, setPendingDownloadAction] = useState<(() => Promise<void>) | null>(null);
  const [hasAcceptedUsagePolicy, setHasAcceptedUsagePolicy] = useState<boolean>(() => {
    return sessionStorage.getItem(`gallery_policy_accepted_${gallery.id}`) === 'true';
  });

  // LGPD Consentimento e Política de Privacidade
  const [hasAcceptedLgpd, setHasAcceptedLgpd] = useState<boolean>(() => {
    return localStorage.getItem(`priceus_lgpd_consent_${gallery.id}`) === 'true';
  });
  const [showLgpdModal, setShowLgpdModal] = useState(false);

  const handleAcceptLgpd = () => {
    localStorage.setItem(`priceus_lgpd_consent_${gallery.id}`, 'true');
    setHasAcceptedLgpd(true);
  };

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

  // Registro automático do visitante na galeria para estatísticas do fotógrafo
  useEffect(() => {
    if (isAuthorized && gallery.id) {
      const saved = sessionStorage.getItem(`gallery_visitor_${gallery.id}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          GalleryService.registerVisitor(gallery.id, parsed.name, parsed.email, parsed.whatsapp).then((reg) => {
            if (reg?.id) sessionStorage.setItem(`gallery_visitor_id_${gallery.id}`, reg.id);
          });
        } catch (e) {}
      } else if (!gallery.require_lead_capture) {
        let anonSessionId = sessionStorage.getItem(`gallery_anon_id_${gallery.id}`);
        if (!anonSessionId) {
          anonSessionId = `Visitante #${Math.floor(1000 + Math.random() * 9000)}`;
          sessionStorage.setItem(`gallery_anon_id_${gallery.id}`, anonSessionId);
        }
        GalleryService.registerVisitor(gallery.id, anonSessionId, null, null).then((reg) => {
          if (reg?.id) sessionStorage.setItem(`gallery_visitor_id_${gallery.id}`, reg.id);
        });
      }
    }
  }, [isAuthorized, gallery.id, gallery.require_lead_capture]);

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
    const registered = await GalleryService.registerVisitor(gallery.id, data.name, data.email, data.whatsapp);
    if (registered?.id) {
      sessionStorage.setItem(`gallery_visitor_id_${gallery.id}`, registered.id);
    }
  };

  const trackDownload = async (count: number = 1) => {
    const visitorId = sessionStorage.getItem(`gallery_visitor_id_${gallery.id}`);
    if (visitorId) {
      await GalleryService.incrementVisitorDownloads(visitorId, count);
    }
  };

  const toggleSelectPhoto = (photoId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedPhotoIds((prev) =>
      prev.includes(photoId) ? prev.filter((id) => id !== photoId) : [...prev, photoId]
    );
  };

  const handleConfirmUsagePolicy = async () => {
    setHasAcceptedUsagePolicy(true);
    sessionStorage.setItem(`gallery_policy_accepted_${gallery.id}`, 'true');
    setShowUsagePolicyModal(false);
    if (pendingDownloadAction) {
      const act = pendingDownloadAction;
      setPendingDownloadAction(null);
      await act();
    }
  };

  const handleDownloadSinglePhoto = async (photo: GalleryPhoto, highRes: boolean) => {
    if (gallery.enable_downloads === false) return;

    // Se exige modal de liberação e é download em baixa res / marca d'água
    if (!highRes && gallery.enable_usage_policy_modal && !hasAcceptedUsagePolicy) {
      setPendingDownloadAction(() => () => executeDownloadSinglePhoto(photo, highRes));
      setShowUsagePolicyModal(true);
      return;
    }

    await executeDownloadSinglePhoto(photo, highRes);
  };

  const executeDownloadSinglePhoto = async (photo: GalleryPhoto, highRes: boolean) => {
    if (gallery.enable_social_promo && gallery.photographer_instagram) {
      setShowSocialPromo(true);
    }

    trackDownload(1);

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
        // Download em Baixa Resolução / Redes Sociais com Marca d'Água dinâmica
        if (gallery.watermark_enabled || gallery.watermark_text || gallery.watermark_logo_url) {
          const watermarkedBlob = await applyWatermarkToImage(photo.supabase_web_path, {
            type: gallery.watermark_type || 'text',
            position: gallery.watermark_position || 'bottom-right',
            opacity: gallery.watermark_opacity ?? 0.7,
            scale: gallery.watermark_scale ?? 0.18,
            text: gallery.watermark_text || photographer.nome_profissional || '© Direitos Reservados',
            logoUrl: gallery.watermark_logo_url || '',
          });
          const blobUrl = URL.createObjectURL(watermarkedBlob);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = `${baseName}_redes_sociais.jpg`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
        } else {
          const jpegBlob = await convertWebpToLowResJpeg(photo.supabase_web_path);
          const url = URL.createObjectURL(jpegBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${baseName}_redes_sociais.jpg`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 10000);
        }
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

    trackDownload(photos.length);

    setDownloadingZip(true);
    setZipProgress(0);
    try {
      const resolutionMode = gallery.allow_high_res_download ? 'high' : 'low';
      const zipBlob = await GalleryService.generateGalleryZip(
        gallery.title,
        photos,
        resolutionMode,
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

          {/* Grid Masonry de Fotos com Fundo Branco Limpo, Abas de Subgalerias (Ensaio/Casamento) e Proofing */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 bg-white">
            {/* Abas de Navegação das Subgalerias / Álbuns (ex: Pré-Casamento, Cerimônia, Festa) */}
            {(() => {
              const subgalleryList = Array.from(
                new Set(
                  photos
                    .map((p) => p.subgallery_name)
                    .filter((name): name is string => Boolean(name && name.trim() && name !== 'Geral'))
                )
              );

              return (
                <>
                  {subgalleryList.length > 0 && (
                    <div className="flex items-center justify-center gap-2 mb-10 overflow-x-auto pb-2 scrollbar-none">
                      <button
                        onClick={() => setActiveSubgallery('all')}
                        className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all border flex items-center gap-1.5 ${
                          activeSubgallery === 'all'
                            ? 'bg-slate-900 text-white border-slate-900 shadow-md scale-105'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span>✨ Todas</span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-200 text-[10px]">{photos.length}</span>
                      </button>

                      {subgalleryList.map((subName) => {
                        const count = photos.filter((p) => p.subgallery_name === subName).length;
                        const isActive = activeSubgallery === subName;
                        return (
                          <button
                            key={subName}
                            onClick={() => setActiveSubgallery(subName)}
                            className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all border flex items-center gap-1.5 ${
                              isActive
                                ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-600/30 scale-105'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <span>📂 {subName}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] ${isActive ? 'bg-purple-800 text-white' : 'bg-slate-200 text-slate-700'}`}>{count}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {photos.length === 0 ? (
                    <div className="text-center py-20 border border-slate-200 rounded-3xl bg-slate-50/50">
                      <Sparkles className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                      <p className="text-slate-600 text-base font-semibold">Galeria sem fotos disponíveis no momento.</p>
                    </div>
                  ) : (
                    <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-5 space-y-5">
                      {(activeSubgallery === 'all'
                        ? photos
                        : photos.filter((p) => p.subgallery_name === activeSubgallery)
                      ).map((photo, index) => {
                        const isSelected = selectedPhotoIds.includes(photo.id);
                        return (
                          <div
                            key={photo.id}
                            onClick={() => setLightboxIndex(index)}
                            className={`break-inside-avoid relative group rounded-none overflow-hidden cursor-pointer bg-slate-100 border transition-all duration-300 shadow-sm hover:shadow-xl ${
                              isSelected ? 'ring-4 ring-emerald-500 border-emerald-500' : 'border-slate-200/70 hover:border-slate-400'
                            }`}
                          >
                      <SmartGalleryImage
                        photo={photo}
                        src={photo.supabase_web_path || photo.supabase_thumb_path}
                        alt={photo.file_name || `Foto ${index + 1}`}
                        className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
                      />

                      {/* Camada de Marca d'Água Anti-Print no Preview da Galeria */}
                      {gallery.watermark_enabled && (
                        <div className="absolute inset-0 pointer-events-none select-none flex items-center justify-center p-3 z-10 overflow-hidden">
                          {gallery.watermark_logo_url ? (
                            <img
                              src={gallery.watermark_logo_url}
                              alt="Marca d'água"
                              className="max-w-[70%] max-h-[70%] object-contain opacity-40 filter drop-shadow-md pointer-events-none"
                            />
                          ) : (
                            <div className="rotate-[-25deg] text-center text-white/35 font-extrabold text-xs sm:text-sm tracking-widest uppercase border border-white/20 px-3 py-1.5 rounded-xl bg-black/10 backdrop-blur-[1px] shadow-sm pointer-events-none">
                              © {gallery.watermark_text || photographer?.nome_profissional || 'DIREITOS RESERVADOS'}
                            </div>
                          )}
                        </div>
                      )}

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
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadSinglePhoto(photo, false);
                          }}
                          className="p-2 rounded-xl bg-white/20 backdrop-blur-md text-white hover:bg-white/40 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        );
      })()}
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

          {/* Rodapé Clean & Link de Privacidade */}
          <footer className="border-t border-slate-100 py-8 bg-slate-50/60 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
            <p>Galeria entregue via <span className="font-bold text-slate-700">PriceU$</span></p>
            <button
              onClick={() => setShowLgpdModal(true)}
              className="text-[11px] text-slate-400 hover:text-slate-600 underline flex items-center gap-1 transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
              <span>Privacidade & LGPD</span>
            </button>
          </footer>

          {/* Banner LGPD Fixo no Rodapé */}
          {!hasAcceptedLgpd && (
            <div className="fixed bottom-0 inset-x-0 z-50 p-3 sm:p-4 bg-slate-950/95 border-t border-slate-800/80 backdrop-blur-xl text-slate-200 shadow-2xl animate-in slide-in-from-bottom duration-300">
              <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-start sm:items-center gap-3 text-slate-300">
                  <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <p className="leading-relaxed">
                    Nós e o fotógrafo <strong>{photographer.nome_profissional || 'responsável'}</strong> utilizamos cookies e armazenamento local para viabilizar a entrega e seleção de fotos. A responsabilidade pelo tratamento dos seus dados é do fotógrafo, em conformidade com a <strong>LGPD (Lei 13.709/2018)</strong>.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                  <button
                    onClick={() => setShowLgpdModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs border border-slate-700 transition-colors flex items-center gap-1"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Ver Política</span>
                  </button>
                  <button
                    onClick={handleAcceptLgpd}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Aceitar e Continuar</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal Completo de Termos e LGPD */}
          {showLgpdModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-slate-200">
                <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">Política de Privacidade & LGPD</h3>
                      <p className="text-xs text-slate-400">Lei Geral de Proteção de Dados (Lei 13.709/2018)</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowLgpdModal(false)}
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-300 leading-relaxed custom-scrollbar">
                  <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 text-indigo-200 flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                    <p>
                      Esta galeria segue rigorosamente a Lei Geral de Proteção de Dados Pessoais (LGPD). Os seus dados estão protegidos e são tratados de maneira transparente.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      1. Coleta e Finalidade dos Dados
                    </h4>
                    <p>
                      Ao acessar esta galeria, preencher identificação de visitante ou efetuar seleção e download de fotos, os dados informados (como nome, e-mail e telefone) são armazenados unicamente para:
                    </p>
                    <ul className="list-disc list-inside space-y-1 pl-2 text-slate-400">
                      <li>Autenticar o acesso à sua galeria privada de fotos.</li>
                      <li>Registrar suas preferências e seleções de fotos (proofing).</li>
                      <li>Gerar links para download do seu pacote de fotografias.</li>
                      <li>Manter histórico de atendimento do seu fotógrafo responsável.</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      2. Controlador vs Provedor de Plataforma
                    </h4>
                    <p>
                      O fotógrafo responsável por esta galeria (<strong>{photographer.nome_profissional || 'Fotógrafo'}</strong>) é o <strong>Controlador dos Dados Pessoais</strong>, sendo integralmente responsável pela guarda, confidencialidade, divulgação e tratamento ético das fotografias e dados de seus clientes. A plataforma <strong>PriceU$</strong> atua exclusivamente como operadora de tecnologia e hospedagem.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      3. Uso de Cookies e Armazenamento Local
                    </h4>
                    <p>
                      Utilizamos cookies estritamente necessários e memória local do seu navegador (<code className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-200">localStorage</code>/<code className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-200">sessionStorage</code>) para garantir a segurança da sessão, salvar suas seleções de fotos e evitar que você precise digitar senhas repetidamente.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      4. Seus Direitos como Titular dos Dados (Art. 18 LGPD)
                    </h4>
                    <p>
                      Você tem total direito de solicitar a confirmação, correção de dados incompletos ou a exclusão definitiva das suas informações pessoais e registros de acesso entrando em contato direto com o seu fotógrafo.
                    </p>
                  </div>
                </div>

                <div className="p-5 border-t border-slate-800 bg-slate-950/50 flex items-center justify-end gap-3">
                  <button
                    onClick={() => {
                      handleAcceptLgpd();
                      setShowLgpdModal(false);
                    }}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Entendi e Aceito os Termos</span>
                  </button>
                </div>
              </div>
            </div>
          )}

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
            watermarkEnabled={gallery.watermark_enabled}
            watermarkText={gallery.watermark_text || photographer?.nome_profissional}
            watermarkLogoUrl={gallery.watermark_logo_url}
          />
        </>
      )}
    </div>
  );
}
