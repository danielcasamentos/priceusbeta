import { useState, useEffect } from 'react';
import { X, Lock, Globe, Shield, Calendar, User, Type, Link as LinkIcon, Image, Search, Clock, ArrowDownAZ } from 'lucide-react';
import { Gallery, GalleryFormData } from '../../types/gallery';
import { supabase } from '../../lib/supabase';

interface GalleryEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: GalleryFormData) => Promise<void>;
  gallery?: Gallery | null;
}

export function GalleryEditor({ isOpen, onClose, onSave, gallery }: GalleryEditorProps) {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [isSlugCustomized, setIsSlugCustomized] = useState(false);
  const [eventDate, setEventDate] = useState('');
  const [clientId, setClientId] = useState('');
  const [password, setPassword] = useState('');
  const [removePassword, setRemovePassword] = useState(false);
  const [photoSortOrder, setPhotoSortOrder] = useState<'capture_asc' | 'capture_desc' | 'name_asc' | 'name_desc' | 'order_asc'>('capture_asc');
  const [isPublicPortfolio, setIsPublicPortfolio] = useState(false);
  const [allowLowResDownload, setAllowLowResDownload] = useState(true);
  const [allowHighResDownload, setAllowHighResDownload] = useState(true);
  const [watermarkEnabled, setWatermarkEnabled] = useState(false);
  const [watermarkText, setWatermarkText] = useState('');
  const [watermarkLogoUrl, setWatermarkLogoUrl] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [pricePerExtraPhoto, setPricePerExtraPhoto] = useState<number>(0);
  const [packagePhotoLimit, setPackagePhotoLimit] = useState<number>(0);
  const [requireLeadCapture, setRequireLeadCapture] = useState(true);
  const [enableSocialPromo, setEnableSocialPromo] = useState(false);
  const [photographerInstagram, setPhotographerInstagram] = useState('');
  const [progressiveDiscounts, setProgressiveDiscounts] = useState<{ min_photos: number; max_photos: number; price_per_photo: number }[]>([]);
  const [status, setStatus] = useState<'draft' | 'active' | 'archived'>('active');

  const [leadsList, setLeadsList] = useState<{ id: string; nome_cliente?: string; client_name?: string; email_cliente?: string; tipo_evento?: string; status?: string }[]>([]);
  const [leadSearch, setLeadSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [enableSales, setEnableSales] = useState(true);
  const [enableDownloads, setEnableDownloads] = useState(true);
  const [requireDownloadPin, setRequireDownloadPin] = useState(false);
  const [downloadPin, setDownloadPin] = useState('');
  const [watermarkType, setWatermarkType] = useState<'text' | 'image'>('text');
  const [watermarkPosition, setWatermarkPosition] = useState<
    | 'top-left'
    | 'top-center'
    | 'top-right'
    | 'center-left'
    | 'center'
    | 'center-right'
    | 'bottom-left'
    | 'bottom-center'
    | 'bottom-right'
  >('bottom-right');
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(0.7);
  const [watermarkScale, setWatermarkScale] = useState<number>(0.18);
  const [watermarkRotation, setWatermarkRotation] = useState<number>(0);
  const [enableUsagePolicyModal, setEnableUsagePolicyModal] = useState(false);
  const [usagePolicyText, setUsagePolicyText] = useState('');

  const formatSlug = (val: string): string => {
    return val
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove acentos
      .replace(/\s+/g, '-')            // substitui espaços por hífen "-"
      .replace(/[^a-z0-9-_]/g, '')    // remove caracteres especiais
      .replace(/-+/g, '-');            // evita múltiplos hífens seguidos
  };

  const formatInstagramHandle = (input: string): string => {
    if (!input || !input.trim()) return '';
    let str = input.trim();
    if (str.includes('instagram.com')) {
      try {
        const url = new URL(str.startsWith('http') ? str : `https://${str}`);
        const parts = url.pathname.split('/').filter(Boolean);
        if (parts.length > 0) str = parts[0];
      } catch (e) {
        str = str.replace(/.*instagram\.com\//i, '');
      }
    }
    str = str.replace(/[\?\/].*/, '').replace(/^@+/, '').trim();
    if (str.length > 0 && !str.startsWith('@')) {
      str = `@${str}`;
    }
    return str;
  };

  useEffect(() => {
    if (gallery) {
      setTitle(gallery.title);
      setSlug(gallery.slug);
      setIsSlugCustomized(true);
      setEventDate(gallery.event_date || '');
      setClientId(gallery.client_id || '');
      setIsPublicPortfolio(gallery.is_public_portfolio);
      setAllowLowResDownload(gallery.allow_low_res_download);
      setAllowHighResDownload(gallery.allow_high_res_download);
      setEnableSales(gallery.enable_sales ?? true);
      setEnableDownloads(gallery.enable_downloads ?? true);
      setRequireDownloadPin(gallery.require_download_pin ?? false);
      setDownloadPin(gallery.download_pin || '');
      setWatermarkEnabled(gallery.watermark_enabled);
      setWatermarkType(gallery.watermark_type || 'text');
      setWatermarkPosition(gallery.watermark_position || 'bottom-right');
      setWatermarkOpacity(gallery.watermark_opacity ?? 0.7);
      setWatermarkScale(gallery.watermark_scale ?? 0.18);
      setWatermarkRotation((gallery as any).watermark_rotation ?? 0);
      setWatermarkText(gallery.watermark_text || '');
      setWatermarkLogoUrl(gallery.watermark_logo_url || '');
      setEnableUsagePolicyModal(gallery.enable_usage_policy_modal ?? false);
      setUsagePolicyText(gallery.usage_policy_text || '');
      setPhotoSortOrder(gallery.photo_sort_order || 'capture_asc');
      setPricePerExtraPhoto(gallery.price_per_extra_photo || 0);
      setPackagePhotoLimit(gallery.package_photo_limit || 0);
      setRequireLeadCapture(gallery.require_lead_capture ?? true);
      setEnableSocialPromo(gallery.enable_social_promo ?? false);
      setPhotographerInstagram(gallery.photographer_instagram || '');
      setProgressiveDiscounts(gallery.progressive_discounts || []);
      setStatus(gallery.status);
      setPassword('');
      setRemovePassword(false);
    } else {
      setTitle('');
      setSlug('');
      setIsSlugCustomized(false);
      setEventDate('');
      setClientId('');
      setPassword('');
      setRemovePassword(false);
      setRequireDownloadPin(false);
      setDownloadPin('');
      setPhotoSortOrder('capture_asc');
      setIsPublicPortfolio(false);
      setAllowLowResDownload(true);
      setAllowHighResDownload(true);
      setEnableSales(true);
      setEnableDownloads(true);
      setWatermarkEnabled(false);
      setWatermarkType('text');
      setWatermarkPosition('bottom-right');
      setWatermarkOpacity(0.7);
      setWatermarkScale(0.18);
      setWatermarkText('');
      setWatermarkLogoUrl('');
      setEnableUsagePolicyModal(false);
      setUsagePolicyText('');
      setPricePerExtraPhoto(0);
      setPackagePhotoLimit(20);
      setRequireLeadCapture(true);
      setEnableSocialPromo(true);
      setPhotographerInstagram('');
      setProgressiveDiscounts([
        { min_photos: 1, max_photos: 5, price_per_photo: 15 },
        { min_photos: 6, max_photos: 15, price_per_photo: 12 },
        { min_photos: 16, max_photos: 999, price_per_photo: 10 }
      ]);
      setStatus('active');
    }
  }, [gallery, isOpen]);

  // Carregar lista de todos os clientes/leads do fotógrafo para vinculação de workflow
  useEffect(() => {
    if (!isOpen) return;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;

      // Buscar instagram no perfil
      supabase
        .from('profiles')
        .select('instagram')
        .eq('id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.instagram) {
            const formatted = formatInstagramHandle(data.instagram);
            if (formatted) {
              setPhotographerInstagram((prev) => prev || formatted);
            }
          }
        });

      // Buscar todos os leads e clientes cadastrados no workflow
      supabase
        .from('leads')
        .select('id, nome_cliente, email_cliente, tipo_evento, status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (error) {
            console.error('Erro ao carregar lista de clientes para galeria:', error);
          } else {
            setLeadsList(data || []);
          }
        });
    });
  }, [isOpen]);

  const filteredLeadsList = leadsList.filter((lead) => {
    if (!leadSearch.trim()) return true;
    const q = leadSearch.toLowerCase().trim();
    const name = (lead.nome_cliente || lead.client_name || '').toLowerCase();
    const email = (lead.email_cliente || '').toLowerCase();
    const eventType = (lead.tipo_evento || '').toLowerCase();
    const statusVal = (lead.status || '').toLowerCase();
    return name.includes(q) || email.includes(q) || eventType.includes(q) || statusVal.includes(q);
  });

  if (!isOpen) return null;

  const handleUploadWatermarkLogo = async (file: File) => {
    if (!file) return;
    setUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `watermarks/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
      const { error: uploadErr } = await supabase.storage
        .from('gallery-assets')
        .upload(filePath, file, { upsert: true });

      if (uploadErr) throw uploadErr;

      const { data: publicUrlData } = supabase.storage
        .from('gallery-assets')
        .getPublicUrl(filePath);

      setWatermarkLogoUrl(publicUrlData.publicUrl);
    } catch (err: any) {
      console.error('Erro ao fazer upload da marca d\'água:', err);
      alert('Falha ao enviar arquivo de marca d\'água PNG. Verifique se é uma imagem válida.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        slug: slug.trim(),
        event_date: eventDate || undefined,
        client_id: clientId || undefined,
        password: password.trim() || undefined,
        remove_password: removePassword,
        is_public_portfolio: isPublicPortfolio,
        allow_low_res_download: allowLowResDownload,
        allow_high_res_download: allowHighResDownload,
        enable_sales: enableSales,
        enable_downloads: enableDownloads,
        require_download_pin: requireDownloadPin,
        download_pin: requireDownloadPin ? downloadPin.trim() : undefined,
        watermark_enabled: watermarkEnabled,
        watermark_type: watermarkType,
        watermark_position: watermarkPosition,
        watermark_opacity: watermarkOpacity,
        watermark_scale: watermarkScale,
        watermark_rotation: watermarkRotation,
        watermark_text: watermarkText.trim() || undefined,
        watermark_logo_url: watermarkLogoUrl.trim() || undefined,
        enable_usage_policy_modal: enableUsagePolicyModal,
        usage_policy_text: usagePolicyText.trim() || undefined,
        photo_sort_order: photoSortOrder,
        price_per_extra_photo: pricePerExtraPhoto,
        package_photo_limit: packagePhotoLimit,
        progressive_discounts: progressiveDiscounts,
        require_lead_capture: requireLeadCapture,
        enable_social_promo: enableSocialPromo,
        photographer_instagram: photographerInstagram.trim() || undefined,
        status,
      });
      onClose();
    } catch (err) {
      console.error('Erro ao salvar galeria:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-8 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <h3 className="text-lg font-bold text-white flex items-center space-x-2">
            <Image className="w-5 h-5 text-blue-400" />
            <span>{gallery ? 'Editar Galeria de Fotos' : 'Nova Galeria de Fotos'}</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Informações Básicas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-1">
                <Type className="w-4 h-4 text-blue-400" />
                <span>Título da Galeria *</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Casamento de João e Maria"
                value={title}
                onChange={(e) => {
                  const newTitle = e.target.value;
                  setTitle(newTitle);
                  if (!isSlugCustomized) {
                    setSlug(formatSlug(newTitle));
                  }
                }}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-1">
                <Calendar className="w-4 h-4 text-blue-400" />
                <span>Data do Evento</span>
              </label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Configuração de Pacote & Venda de Fotos Extras (Proofing) */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-blue-500/30 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700/80 pb-2">
              <span className="text-sm font-bold text-blue-400 flex items-center space-x-2">
                <span>📸 Pacote de Fotos & Venda de Extras (Proofing)</span>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Fotos Inclusas no Pacote (0 = ilimitado)
                </label>
                <input
                  type="number"
                  min={0}
                  value={packagePhotoLimit}
                  onChange={(e) => setPackagePhotoLimit(Number(e.target.value))}
                  placeholder="Ex: 20"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500"
                />
                <p className="text-[11px] text-slate-400">Quantidade contratada pelos noivos/cliente</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Preço Base por Foto Extra (R$)
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={pricePerExtraPhoto}
                  onChange={(e) => setPricePerExtraPhoto(Number(e.target.value))}
                  placeholder="Ex: 15.00"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-emerald-400 font-bold text-sm focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[11px] text-slate-400">Valor cobrado quando ultrapassar a cota</p>
              </div>
            </div>

            {/* Descontos Progressivos */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200">
                  Tabela de Descontos Progressivos em Lote (Fotos Extras)
                </label>
                <button
                  type="button"
                  onClick={() => setProgressiveDiscounts([...progressiveDiscounts, { min_photos: 1, max_photos: 10, price_per_photo: 10 }])}
                  className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
                >
                  + Adicionar Faixa
                </button>
              </div>

              {progressiveDiscounts.map((tier, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-slate-900 p-2 rounded-xl border border-slate-700 text-xs">
                  <span className="text-slate-400 shrink-0">De:</span>
                  <input
                    type="number"
                    min={1}
                    value={tier.min_photos}
                    onChange={(e) => {
                      const updated = [...progressiveDiscounts];
                      updated[idx].min_photos = Number(e.target.value);
                      setProgressiveDiscounts(updated);
                    }}
                    className="w-16 bg-slate-800 px-2 py-1 rounded text-white text-center"
                  />
                  <span className="text-slate-400 shrink-0">até:</span>
                  <input
                    type="number"
                    min={1}
                    value={tier.max_photos}
                    onChange={(e) => {
                      const updated = [...progressiveDiscounts];
                      updated[idx].max_photos = Number(e.target.value);
                      setProgressiveDiscounts(updated);
                    }}
                    className="w-16 bg-slate-800 px-2 py-1 rounded text-white text-center"
                  />
                  <span className="text-slate-400 shrink-0">extras: R$</span>
                  <input
                    type="number"
                    step={0.5}
                    value={tier.price_per_photo}
                    onChange={(e) => {
                      const updated = [...progressiveDiscounts];
                      updated[idx].price_per_photo = Number(e.target.value);
                      setProgressiveDiscounts(updated);
                    }}
                    className="w-20 bg-slate-800 px-2 py-1 rounded text-emerald-400 font-bold text-center"
                  />
                  <span className="text-slate-400 shrink-0">/cada</span>
                  <button
                    type="button"
                    onClick={() => setProgressiveDiscounts(progressiveDiscounts.filter((_, i) => i !== idx))}
                    className="text-rose-400 hover:text-rose-300 ml-auto font-bold px-1"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Divulgação Social no Instagram & Captura de Leads */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-800 space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="space-y-0.5">
                  <span className="text-sm font-semibold text-amber-300 flex items-center space-x-2">
                    <span>📣 Ativar Divulgação Instagram</span>
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Insere marca d'água discreta com seu @ e convida convidados a marcar seu estúdio ao postar
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={enableSocialPromo}
                  onChange={(e) => setEnableSocialPromo(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0"
                />
              </label>

              {enableSocialPromo && (
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-300">Seu perfil do Instagram:</label>
                  <input
                    type="text"
                    placeholder="Ex: @danielazevedo.foto"
                    value={photographerInstagram}
                    onChange={(e) => setPhotographerInstagram(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-amber-300 text-xs focus:outline-none"
                  />
                </div>
              )}
            </div>

            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-800 space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="space-y-0.5">
                  <span className="text-sm font-semibold text-emerald-400 flex items-center space-x-2">
                    <span>👥 Capturar Cadastro de Visitantes</span>
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Solicita Nome, E-mail e WhatsApp do visitante antes do acesso à galeria
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={requireLeadCapture}
                  onChange={(e) => setRequireLeadCapture(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0"
                />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-1">
                <LinkIcon className="w-4 h-4 text-blue-400" />
                <span>Slug da URL Personalizado</span>
              </label>
              <input
                type="text"
                placeholder="casamento-joao-e-maria"
                value={slug}
                onChange={(e) => {
                  const val = e.target.value;
                  const formatted = formatSlug(val);
                  setSlug(formatted);
                  if (!val.trim()) {
                    setIsSlugCustomized(false);
                    setSlug(formatSlug(title));
                  } else {
                    setIsSlugCustomized(true);
                  }
                }}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-1">
                  <User className="w-4 h-4 text-blue-400" />
                  <span>Vincular Cliente (Workflow)</span>
                </label>
              </div>

              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="">Sem cliente vinculado</option>
                {filteredLeadsList.map((lead) => {
                  const name = lead.nome_cliente || lead.client_name || `Cliente #${lead.id.substring(0, 6)}`;
                  const detail = lead.tipo_evento ? ` (${lead.tipo_evento})` : '';
                  return (
                    <option key={lead.id} value={lead.id}>
                      {name}{detail}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Ordem Padrão de Exibição das Fotos para os Clientes */}
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/80 space-y-3">
            <div className="flex items-center space-x-2 text-sm font-semibold text-white">
              <Clock className="w-4 h-4 text-blue-400" />
              <span>Ordem Padrão das Fotos na Galeria Pública</span>
            </div>
            <p className="text-xs text-slate-400">
              Escolha a ordem inicial em que seus clientes e convidados visualizarão as fotos:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setPhotoSortOrder('capture_asc')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  photoSortOrder === 'capture_asc'
                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm ring-1 ring-blue-500/50'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <div className="font-semibold text-xs text-blue-300 flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <span>Hora da Captura</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Cerimônia ➔ Festa (Cronológica)</div>
              </button>

              <button
                type="button"
                onClick={() => setPhotoSortOrder('capture_desc')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  photoSortOrder === 'capture_desc'
                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm ring-1 ring-blue-500/50'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <div className="font-semibold text-xs text-blue-300 flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-400 rotate-180" />
                  <span>Mais Recentes</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Últimas fotos tiradas primeiro</div>
              </button>

              <button
                type="button"
                onClick={() => setPhotoSortOrder('name_asc')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  photoSortOrder === 'name_asc'
                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm ring-1 ring-blue-500/50'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <div className="font-semibold text-xs text-blue-300 flex items-center space-x-1.5">
                  <ArrowDownAZ className="w-3.5 h-3.5 text-blue-400" />
                  <span>Nome do Arquivo</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Ordem alfanumérica (A - Z)</div>
              </button>
            </div>
          </div>

          {/* Proteção por Senha */}
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white flex items-center space-x-2">
                <Lock className="w-4 h-4 text-amber-400" />
                <span>Proteção por Senha</span>
              </span>
              {gallery?.password_hash && (
                <label className="flex items-center space-x-2 text-xs text-red-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={removePassword}
                    onChange={(e) => setRemovePassword(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-900 text-red-500 focus:ring-0"
                  />
                  <span>Remover senha atual</span>
                </label>
              )}
            </div>

            {!removePassword && (
              <input
                type="password"
                placeholder={gallery?.password_hash ? 'Nova senha (deixe em branco para manter)' : 'Defina uma senha de acesso'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500 transition-colors"
              />
            )}
          </div>

          {/* Master Toggles: Ativar/Desativar Vendas e Downloads */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
              <div className="space-y-0.5">
                <span className="text-sm font-medium text-white flex items-center space-x-2">
                  <span className="text-emerald-400">💰</span>
                  <span>Permitir Venda de Fotos Extras</span>
                </span>
                <p className="text-xs text-slate-400">Ativa o sistema de compras de fotos adicionais na galeria</p>
              </div>
              <input
                type="checkbox"
                checked={enableSales}
                onChange={(e) => setEnableSales(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0"
              />
            </label>

            <label className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
              <div className="space-y-0.5">
                <span className="text-sm font-medium text-white flex items-center space-x-2">
                  <span className="text-blue-400">📥</span>
                  <span>Permitir Downloads na Galeria</span>
                </span>
                <p className="text-xs text-slate-400">Habilita botão de download de fotos para os clientes</p>
              </div>
              <input
                type="checkbox"
                checked={enableDownloads}
                onChange={(e) => setEnableDownloads(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-0"
              />
            </label>
          </div>

          {/* Proteção de Download por Senha / PIN */}
          {enableDownloads && (
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-800 space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="space-y-0.5">
                  <span className="text-sm font-medium text-white flex items-center space-x-2">
                    <span className="text-amber-400">🔒</span>
                    <span>Exigir Senha / PIN para Baixar Fotos</span>
                  </span>
                  <p className="text-xs text-slate-400">
                    Permite que todos visualizem as fotos, mas exige uma senha para liberar o download individual ou ZIP
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={requireDownloadPin}
                  onChange={(e) => setRequireDownloadPin(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0"
                />
              </label>

              {requireDownloadPin && (
                <div className="pt-2 border-t border-slate-700/80 space-y-2 animate-in fade-in duration-200">
                  <label className="text-xs font-semibold text-slate-300">
                    Senha / PIN de Download (para os clientes que forem baixar):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Ex: 1234 ou noivos2026"
                      value={downloadPin}
                      onChange={(e) => setDownloadPin(e.target.value)}
                      className="flex-1 px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs font-mono font-bold focus:outline-none focus:border-amber-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setDownloadPin(Math.floor(1000 + Math.random() * 9000).toString())}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 text-xs font-bold transition flex items-center gap-1.5 shrink-0"
                    >
                      <span>🎲 Gerar PIN 4 Dígitos</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Toggles de Configuração */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
              <div className="space-y-0.5">
                <span className="text-sm font-medium text-white flex items-center space-x-2">
                  <Globe className="w-4 h-4 text-emerald-400" />
                  <span>Exibir no Portfólio Público</span>
                </span>
                <p className="text-xs text-slate-400">Mostrar em /slugUsuario/portfolio</p>
              </div>
              <input
                type="checkbox"
                checked={isPublicPortfolio}
                onChange={(e) => setIsPublicPortfolio(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
              />
            </label>

            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-800 space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="space-y-0.5">
                  <span className="text-sm font-medium text-white flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-purple-400" />
                    <span>Ativar Marca d'Água (Divulgação/Anti-Print)</span>
                  </span>
                  <p className="text-xs text-slate-400">Insere marca d'água de direitos autorais ou logo PNG</p>
                </div>
                <input
                  type="checkbox"
                  checked={watermarkEnabled}
                  onChange={(e) => setWatermarkEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-purple-500 focus:ring-0"
                />
              </label>

              {watermarkEnabled && (
                <div className="pt-3 border-t border-slate-700/80 space-y-4 animate-in fade-in duration-200">
                  {/* Tipo de Marca: Texto ou Logo PNG */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-300">Tipo de Marca d'Água:</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setWatermarkType('text')}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all ${
                          watermarkType === 'text'
                            ? 'bg-purple-600/30 text-purple-300 border-purple-500'
                            : 'bg-slate-900 text-slate-400 border-slate-700'
                        }`}
                      >
                        ✍️ Texto Simples
                      </button>
                      <button
                        type="button"
                        onClick={() => setWatermarkType('image')}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all ${
                          watermarkType === 'image'
                            ? 'bg-purple-600/30 text-purple-300 border-purple-500'
                            : 'bg-slate-900 text-slate-400 border-slate-700'
                        }`}
                      >
                        🖼️ Logo PNG (sem fundo)
                      </button>
                    </div>
                  </div>

                  {/* Texto da Marca d'Água */}
                  {watermarkType === 'text' ? (
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-300">Texto dos Direitos Autorais:</label>
                      <input
                        type="text"
                        placeholder="Ex: © Nome do Fotógrafo / Estúdio"
                        value={watermarkText}
                        onChange={(e) => setWatermarkText(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-purple-200 text-xs focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  ) : (
                    /* Logo PNG sem fundo */
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-slate-300">Logo Personalizado (PNG sem fundo):</label>
                      <div className="flex items-center gap-3">
                        {watermarkLogoUrl ? (
                          <div className="relative group p-2 bg-slate-950 rounded-xl border border-slate-700 flex items-center gap-2">
                            <img src={watermarkLogoUrl} alt="Logo Marca d'água" className="h-8 max-w-[120px] object-contain" />
                            <button
                              type="button"
                              onClick={() => setWatermarkLogoUrl('')}
                              className="p-1 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                              title="Remover Logo"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 transition-all text-xs font-medium inline-flex items-center gap-1.5">
                            <Image className="w-3.5 h-3.5" />
                            <span>{uploadingLogo ? 'Enviando...' : 'Upload Logo PNG'}</span>
                            <input
                              type="file"
                              accept="image/png,image/webp"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleUploadWatermarkLogo(file);
                              }}
                              disabled={uploadingLogo}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Grid Seletor de 9 Posições da Marca d'Água */}
                  <div className="space-y-2 pt-2 border-t border-slate-700/60">
                    <label className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                      <span>Posição da Marca d'Água (9 Cantos/Laterais):</span>
                      <span className="text-purple-400 font-bold capitalize text-[10px]">{watermarkPosition}</span>
                    </label>
                    <div className="grid grid-cols-3 gap-1.5 p-2 bg-slate-950 rounded-xl border border-slate-700 max-w-[240px] mx-auto">
                      {[
                        { id: 'top-left', label: '↖ Superior Esquerdo' },
                        { id: 'top-center', label: '⬆ Superior Meio' },
                        { id: 'top-right', label: '↗ Superior Direito' },
                        { id: 'center-left', label: '⬅ Meio Esquerdo' },
                        { id: 'center', label: '🎯 Centro' },
                        { id: 'center-right', label: '➡ Meio Direito' },
                        { id: 'bottom-left', label: '↙ Inferior Esquerdo' },
                        { id: 'bottom-center', label: '⬇ Inferior Meio' },
                        { id: 'bottom-right', label: '↘ Inferior Direito' },
                      ].map((pos) => (
                        <button
                          key={pos.id}
                          type="button"
                          title={pos.label}
                          onClick={() => setWatermarkPosition(pos.id as any)}
                          className={`h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center border ${
                            watermarkPosition === pos.id
                              ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-600/30 scale-105'
                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                          }`}
                        >
                          {pos.label.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Transparência & Tamanho Sliders */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-slate-300">
                        <span>Opacidade:</span>
                        <span className="font-bold text-purple-400">{Math.round(watermarkOpacity * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min={0.1}
                        max={1.0}
                        step={0.05}
                        value={watermarkOpacity}
                        onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                        className="w-full accent-purple-500 cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-slate-300">
                        <span>Tamanho:</span>
                        <span className="font-bold text-purple-400">{Math.round(watermarkScale * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min={0.05}
                        max={0.5}
                        step={0.01}
                        value={watermarkScale}
                        onChange={(e) => setWatermarkScale(parseFloat(e.target.value))}
                        className="w-full accent-purple-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Rotação da Marca d'Água */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-300">
                      <span>Rotação:</span>
                      <span className="font-bold text-purple-400">{watermarkRotation}°</span>
                    </div>
                    <input
                      type="range"
                      min={-180}
                      max={180}
                      step={1}
                      value={watermarkRotation}
                      onChange={(e) => setWatermarkRotation(parseInt(e.target.value))}
                      className="w-full accent-purple-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>-180°</span>
                      <button
                        type="button"
                        onClick={() => setWatermarkRotation(0)}
                        className="text-purple-400 hover:text-purple-300 font-bold transition-colors"
                      >
                        Reset 0°
                      </button>
                      <span>+180°</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Modal de Política de Liberação de Imagem */}
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-800 space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="space-y-0.5">
                <span className="text-sm font-medium text-white flex items-center space-x-2">
                  <span>📜</span>
                  <span>Exibir Modal de Termos de Liberação de Imagem</span>
                </span>
                <p className="text-xs text-slate-400">Cliente lê os termos de divulgação/marcação antes de baixar fotos gratuitas com marca</p>
              </div>
              <input
                type="checkbox"
                checked={enableUsagePolicyModal}
                onChange={(e) => setEnableUsagePolicyModal(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-purple-500 focus:ring-0"
              />
            </label>

            {enableUsagePolicyModal && (
              <div className="space-y-1.5 pt-2 border-t border-slate-700/80 animate-in fade-in duration-200">
                <label className="text-[11px] font-semibold text-slate-300">Texto Personalizado do Modal de Liberação (opcional):</label>
                <textarea
                  rows={3}
                  placeholder="Deixe em branco para usar os termos padrão (marcação do Instagram obrigatoria e não remoção da marca)..."
                  value={usagePolicyText}
                  onChange={(e) => setUsagePolicyText(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-purple-500"
                />
              </div>
            )}
          </div>

          {/* Status */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Status da Galeria
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="active">Ativa (Visível por link)</option>
              <option value="draft">Rascunho (Privada para teste)</option>
              <option value="archived">Arquivada</option>
            </select>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50"
            >
              {saving ? 'Salvando...' : gallery ? 'Atualizar Galeria' : 'Criar Galeria'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
