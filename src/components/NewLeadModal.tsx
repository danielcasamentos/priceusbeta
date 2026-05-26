import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  X, User, Mail, Phone, Calendar, MapPin, DollarSign,
  Briefcase, Tag, MessageSquare, Loader2, UserPlus, ChevronDown,
} from 'lucide-react';

interface TemplateOption {
  id: string;
  nome_template: string;
}

interface NewLeadModalProps {
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

type LeadStatus = 'novo' | 'contatado' | 'em_negociacao' | 'fazer_followup';

const ORIGEM_OPTIONS = [
  { value: 'instagram', label: '📸 Instagram' },
  { value: 'indicacao', label: '🤝 Indicação' },
  { value: 'whatsapp', label: '💬 WhatsApp Direto' },
  { value: 'site', label: '🌐 Site / Google' },
  { value: 'facebook', label: '👥 Facebook' },
  { value: 'tiktok', label: '🎵 TikTok' },
  { value: 'evento', label: '🎪 Evento / Feira' },
  { value: 'outro', label: '📋 Outro' },
];

const STATUS_OPTIONS: { value: LeadStatus; label: string; color: string }[] = [
  { value: 'novo', label: '🆕 Novo', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  { value: 'contatado', label: '💬 Contatado', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' },
  { value: 'em_negociacao', label: '🤝 Em Negociação', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' },
  { value: 'fazer_followup', label: '📞 Fazer Follow-up', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' },
];

const inputCls =
  'w-full px-3 py-2.5 border border-gray-200 dark:border-[rgba(255,255,255,0.1)] bg-white dark:bg-[#07101f] text-gray-900 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 placeholder-gray-400 dark:placeholder-[rgba(255,255,255,0.3)] transition-colors';
const labelCls =
  'block text-xs font-semibold text-gray-500 dark:text-[rgba(255,255,255,0.5)] uppercase tracking-wider mb-1.5 flex items-center gap-1.5';

export function NewLeadModal({ userId, onClose, onSuccess }: NewLeadModalProps) {
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [tipoEvento, setTipoEvento] = useState('');
  const [dataEvento, setDataEvento] = useState('');
  const [cidade, setCidade] = useState('');
  const [valor, setValor] = useState('');
  const [origem, setOrigem] = useState('instagram');
  const [status, setStatus] = useState<LeadStatus>('novo');
  const [notas, setNotas] = useState('');

  useEffect(() => {
    supabase
      .from('templates')
      .select('id, nome_template')
      .eq('user_id', userId)
      .order('nome_template')
      .then(({ data }) => {
        if (data) setTemplates(data);
      });
  }, [userId]);

  // Auto-fill tipoEvento when a template is selected
  const handleTemplateChange = (id: string) => {
    setTemplateId(id);
    if (id) {
      const tpl = templates.find((t) => t.id === id);
      if (tpl && !tipoEvento) setTipoEvento(tpl.nome_template);
    }
  };

  const handleValorChange = (raw: string) => {
    // Accept only digits, then format as BRL
    const digits = raw.replace(/\D/g, '');
    setValor(digits);
  };

  const valorNumerico = valor ? parseInt(valor, 10) / 100 : 0;

  const formatValorDisplay = () => {
    if (!valor) return '';
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(valorNumerico);
  };

  const handleSave = async () => {
    if (!nome.trim()) {
      setError('O nome do cliente é obrigatório.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload: Record<string, any> = {
        user_id: userId,
        nome_cliente: nome.trim(),
        email_cliente: email.trim() || null,
        telefone_cliente: telefone.trim() || null,
        template_id: templateId || null,
        tipo_evento: tipoEvento.trim() || null,
        data_evento: dataEvento || null,
        cidade_evento: cidade.trim() || null,
        valor_total: valorNumerico || 0,
        status,
        origem: origem || 'manual',
        orcamento_detalhe: {
          notas: notas.trim() || null,
          origem_canal: origem,
          cadastro_manual: true,
        },
      };

      const { error: insertError } = await supabase.from('leads').insert(payload);
      if (insertError) throw insertError;

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao salvar o lead. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#0a1628] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col border dark:border-[rgba(255,255,255,0.06)] overflow-hidden">

        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-indigo-600 to-blue-600 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Cadastrar Novo Lead</h2>
              <p className="text-xs text-indigo-100 mt-0.5">
                Adicione contatos de outras fontes ao seu funil de vendas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">

          {/* Dados do Cliente */}
          <div className="bg-gray-50 dark:bg-[rgba(255,255,255,0.03)] rounded-2xl p-4 border border-gray-100 dark:border-[rgba(255,255,255,0.06)]">
            <p className="text-xs font-bold text-gray-400 dark:text-[rgba(255,255,255,0.4)] uppercase tracking-wider mb-4 flex items-center gap-2">
              <User className="w-3.5 h-3.5" /> Dados do Cliente
            </p>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>
                  <User className="w-3 h-3" /> Nome Completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="new-lead-nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Nome do cliente"
                  className={inputCls}
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>
                    <Phone className="w-3 h-3" /> Telefone / WhatsApp
                  </label>
                  <input
                    type="tel"
                    id="new-lead-telefone"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>
                    <Mail className="w-3 h-3" /> E-mail
                  </label>
                  <input
                    type="email"
                    id="new-lead-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                    className={inputCls}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Dados do Evento */}
          <div className="bg-gray-50 dark:bg-[rgba(255,255,255,0.03)] rounded-2xl p-4 border border-gray-100 dark:border-[rgba(255,255,255,0.06)]">
            <p className="text-xs font-bold text-gray-400 dark:text-[rgba(255,255,255,0.4)] uppercase tracking-wider mb-4 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" /> Dados do Evento / Serviço
            </p>
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>
                    <Briefcase className="w-3 h-3" /> Template de Orçamento
                  </label>
                  <div className="relative">
                    <select
                      id="new-lead-template"
                      value={templateId}
                      onChange={(e) => handleTemplateChange(e.target.value)}
                      className={`${inputCls} pr-8 appearance-none`}
                    >
                      <option value="">Sem template (avulso)</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>{t.nome_template}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>
                    <Tag className="w-3 h-3" /> Tipo de Evento / Serviço
                  </label>
                  <input
                    type="text"
                    id="new-lead-tipo"
                    value={tipoEvento}
                    onChange={(e) => setTipoEvento(e.target.value)}
                    placeholder="Ex: Casamento, Aniversário..."
                    className={inputCls}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>
                    <Calendar className="w-3 h-3" /> Data do Evento
                  </label>
                  <input
                    type="date"
                    id="new-lead-data"
                    value={dataEvento}
                    onChange={(e) => setDataEvento(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>
                    <MapPin className="w-3 h-3" /> Cidade
                  </label>
                  <input
                    type="text"
                    id="new-lead-cidade"
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    placeholder="Ex: São Paulo - SP"
                    className={inputCls}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>
                  <DollarSign className="w-3 h-3" /> Valor do Orçamento (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[rgba(255,255,255,0.4)] text-sm font-medium">
                    R$
                  </span>
                  <input
                    type="text"
                    id="new-lead-valor"
                    inputMode="numeric"
                    value={formatValorDisplay()}
                    onChange={(e) => handleValorChange(e.target.value)}
                    placeholder="0,00"
                    className={`${inputCls} pl-9`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* CRM e Negócio */}
          <div className="bg-gray-50 dark:bg-[rgba(255,255,255,0.03)] rounded-2xl p-4 border border-gray-100 dark:border-[rgba(255,255,255,0.06)]">
            <p className="text-xs font-bold text-gray-400 dark:text-[rgba(255,255,255,0.4)] uppercase tracking-wider mb-4 flex items-center gap-2">
              <Tag className="w-3.5 h-3.5" /> CRM e Negócio
            </p>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>
                  Canal de Origem
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ORIGEM_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setOrigem(o.value)}
                      className={`px-2 py-2 text-xs font-semibold rounded-xl border transition-all text-center leading-tight ${
                        origem === o.value
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white dark:bg-[rgba(255,255,255,0.04)] border-gray-200 dark:border-[rgba(255,255,255,0.08)] text-gray-600 dark:text-[rgba(255,255,255,0.6)] hover:border-indigo-300 dark:hover:border-indigo-500'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelCls}>
                  Status Inicial no Funil
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {STATUS_OPTIONS.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setStatus(s.value)}
                      className={`px-3 py-2.5 text-xs font-semibold rounded-xl border transition-all text-center ${
                        status === s.value
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white dark:bg-[rgba(255,255,255,0.04)] border-gray-200 dark:border-[rgba(255,255,255,0.08)] text-gray-600 dark:text-[rgba(255,255,255,0.6)] hover:border-blue-300 dark:hover:border-blue-500'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelCls}>
                  <MessageSquare className="w-3 h-3" /> Notas / Observações
                </label>
                <textarea
                  id="new-lead-notas"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  rows={3}
                  placeholder="Anotações sobre o cliente, preferências, contexto da negociação..."
                  className={`${inputCls} resize-none`}
                />
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-[rgba(239,68,68,0.1)] rounded-xl border border-red-200 dark:border-[rgba(239,68,68,0.2)]">
              <X className="w-4 h-4 text-red-600 shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-[rgba(255,255,255,0.06)] bg-gray-50 dark:bg-[rgba(255,255,255,0.02)] shrink-0 flex items-center justify-between gap-3">
          <p className="text-xs text-gray-400 dark:text-[rgba(255,255,255,0.35)]">
            Lead entrará na aba <strong>Timeline</strong> imediatamente
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-[rgba(255,255,255,0.7)] bg-white dark:bg-[rgba(255,255,255,0.06)] border border-gray-200 dark:border-[rgba(255,255,255,0.1)] rounded-xl hover:bg-gray-100 dark:hover:bg-[rgba(255,255,255,0.1)] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !nome.trim()}
              className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Cadastrar Lead
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
