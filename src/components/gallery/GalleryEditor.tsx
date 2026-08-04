import { useState, useEffect } from 'react';
import { X, Lock, Globe, Shield, Calendar, User, Type, Link as LinkIcon, Image, Search } from 'lucide-react';
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
  const [eventDate, setEventDate] = useState('');
  const [clientId, setClientId] = useState('');
  const [password, setPassword] = useState('');
  const [removePassword, setRemovePassword] = useState(false);
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
  const [isSlugCustomized, setIsSlugCustomized] = useState(false);

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
      setWatermarkEnabled(gallery.watermark_enabled);
      setWatermarkText(gallery.watermark_text || '');
      setWatermarkLogoUrl(gallery.watermark_logo_url || '');
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
      setIsPublicPortfolio(false);
      setAllowLowResDownload(true);
      setAllowHighResDownload(true);
      setWatermarkEnabled(false);
      setWatermarkText('');
      setWatermarkLogoUrl('');
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
  }, [isOpen, gallery]);

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
        watermark_enabled: watermarkEnabled,
        watermark_text: watermarkText.trim() || undefined,
        watermark_logo_url: watermarkLogoUrl.trim() || undefined,
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
                  setSlug(formatSlug(newTitle));
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
                    <span>Ativar Marca d'Água de Proteção (Anti-Print)</span>
                  </span>
                  <p className="text-xs text-slate-400">Sobrepõe marca d'água no preview e remove ao baixar fotos contratadas</p>
                </div>
                <input
                  type="checkbox"
                  checked={watermarkEnabled}
                  onChange={(e) => setWatermarkEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-purple-500 focus:ring-0"
                />
              </label>

              {watermarkEnabled && (
                <div className="pt-3 border-t border-slate-700/80 space-y-3 animate-in fade-in duration-200">
                  {/* Texto da Marca d'Água */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300">
                      Texto dos Direitos Autorais (opcional):
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: © Nome do Fotógrafo / Estúdio"
                      value={watermarkText}
                      onChange={(e) => setWatermarkText(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-purple-200 text-xs focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  {/* Logo PNG sem fundo */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-300">
                      Logo Personalizado (PNG sem fundo):
                    </label>
                    <div className="flex items-center gap-3">
                      {watermarkLogoUrl ? (
                        <div className="relative group p-2 bg-slate-950 rounded-xl border border-slate-700 flex items-center gap-2">
                          <img
                            src={watermarkLogoUrl}
                            alt="Logo Marca d'água"
                            className="h-8 max-w-[120px] object-contain"
                          />
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
                </div>
              )}
            </div>
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
