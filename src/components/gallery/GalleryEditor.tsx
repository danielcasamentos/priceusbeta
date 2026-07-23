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
  const [pricePerExtraPhoto, setPricePerExtraPhoto] = useState<number>(0);
  const [status, setStatus] = useState<'draft' | 'active' | 'archived'>('active');

  const [leadsList, setLeadsList] = useState<{ id: string; nome_cliente?: string; client_name?: string; email_cliente?: string; tipo_evento?: string; status?: string }[]>([]);
  const [leadSearch, setLeadSearch] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (gallery) {
      setTitle(gallery.title);
      setSlug(gallery.slug);
      setEventDate(gallery.event_date || '');
      setClientId(gallery.client_id || '');
      setIsPublicPortfolio(gallery.is_public_portfolio);
      setAllowLowResDownload(gallery.allow_low_res_download);
      setAllowHighResDownload(gallery.allow_high_res_download);
      setWatermarkEnabled(gallery.watermark_enabled);
      setWatermarkText(gallery.watermark_text || '');
      setPricePerExtraPhoto(gallery.price_per_extra_photo || 0);
      setStatus(gallery.status);
      setPassword('');
      setRemovePassword(false);
    } else {
      setTitle('');
      setSlug('');
      setEventDate('');
      setClientId('');
      setPassword('');
      setRemovePassword(false);
      setIsPublicPortfolio(false);
      setAllowLowResDownload(true);
      setAllowHighResDownload(true);
      setWatermarkEnabled(false);
      setWatermarkText('');
      setPricePerExtraPhoto(0);
      setStatus('active');
    }
  }, [gallery, isOpen]);

  // Carregar lista de clientes/leads do fotógrafo
  useEffect(() => {
    if (!isOpen) return;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from('leads')
        .select('id, nome_cliente, email_cliente, tipo_evento, status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (error) {
            console.error('Erro ao carregar clientes/leads:', error);
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
        price_per_extra_photo: pricePerExtraPhoto,
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
                onChange={(e) => setTitle(e.target.value)}
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
                onChange={(e) => setSlug(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-1">
                  <User className="w-4 h-4 text-blue-400" />
                  <span>Vincular Cliente (Workflow)</span>
                </label>
                {leadsList.length > 0 && (
                  <span className="text-[10px] text-slate-400">
                    {filteredLeadsList.length}/{leadsList.length}
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                {/* Campo de Busca Rápida de Lead */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filtrar por nome, evento..."
                    value={leadSearch}
                    onChange={(e) => setLeadSearch(e.target.value)}
                    className="w-full pl-9 pr-7 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  {leadSearch && (
                    <button
                      type="button"
                      onClick={() => setLeadSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Dropdown de Seleção de Lead */}
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="">Sem cliente vinculado</option>
                  {filteredLeadsList.map((lead) => {
                    const name = lead.nome_cliente || lead.client_name || `Cliente #${lead.id.substring(0, 6)}`;
                    const detail = lead.tipo_evento ? ` (${lead.tipo_evento})` : lead.status ? ` [${lead.status}]` : '';
                    return (
                      <option key={lead.id} value={lead.id}>
                        {name}{detail}
                      </option>
                    );
                  })}
                </select>
              </div>
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

            <label className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
              <div className="space-y-0.5">
                <span className="text-sm font-medium text-white flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-purple-400" />
                  <span>Ativar Marca d'Água</span>
                </span>
                <p className="text-xs text-slate-400">Desenha texto sobre as imagens web</p>
              </div>
              <input
                type="checkbox"
                checked={watermarkEnabled}
                onChange={(e) => setWatermarkEnabled(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
              />
            </label>
          </div>

          {watermarkEnabled && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Texto da Marca d'Água
              </label>
              <input
                type="text"
                placeholder="Ex: © Meu Estúdio Fotográfico"
                value={watermarkText}
                onChange={(e) => setWatermarkText(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          )}

          {/* Permissões de Download */}
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-800 space-y-3">
            <span className="text-sm font-semibold text-white">Permissões de Download</span>
            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-6">
              <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowLowResDownload}
                  onChange={(e) => setAllowLowResDownload(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
                />
                <span>Permitir Baixa Resolução (WebP)</span>
              </label>

              <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowHighResDownload}
                  onChange={(e) => setAllowHighResDownload(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
                />
                <span>Permitir Alta Resolução (Original)</span>
              </label>
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
