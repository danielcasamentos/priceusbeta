import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { checkAvailability, AvailabilityResult } from '../services/availabilityService';
import { Product, PriceBreakdown } from '../lib/whatsappMessageGenerator';
import {
  X, User, Mail, Phone, Calendar, MapPin, DollarSign,
  Briefcase, Tag, MessageSquare, Loader2, UserPlus, ChevronDown, Check, AlertTriangle, Info
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

  // Disponibilidade
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [disponibilidade, setDisponibilidade] = useState<AvailabilityResult | null>(null);

  // Produtos do template
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [templateProducts, setTemplateProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Record<string, number>>({});
  const [isManualValueOverride, setIsManualValueOverride] = useState(false);

  // Carrega templates ao abrir
  useEffect(() => {
    async function loadTemplates() {
      const { data } = await supabase
        .from('templates')
        .select('id, nome_template')
        .eq('user_id', userId)
        .order('nome_template');
      if (data) setTemplates(data);
    }
    loadTemplates();
  }, [userId]);

  // Verifica disponibilidade da agenda quando a data muda
  useEffect(() => {
    if (!dataEvento) {
      setDisponibilidade(null);
      return;
    }

    let isMounted = true;
    async function checkDate() {
      setCheckingAvailability(true);
      try {
        const res = await checkAvailability(userId, dataEvento);
        if (isMounted) {
          setDisponibilidade(res);
        }
      } catch (err) {
        console.error('Erro ao verificar disponibilidade no modal:', err);
      } finally {
        if (isMounted) {
          setCheckingAvailability(false);
        }
      }
    }
    checkDate();

    return () => {
      isMounted = false;
    };
  }, [userId, dataEvento]);

  // Carrega produtos do template selecionado
  useEffect(() => {
    if (!templateId) {
      setTemplateProducts([]);
      setSelectedProducts({});
      if (!isManualValueOverride) {
        setValor('');
      }
      return;
    }

    let isMounted = true;
    async function loadTemplateProducts() {
      setLoadingProducts(true);
      try {
        const { data, error: prodErr } = await supabase
          .from('produtos')
          .select('*')
          .eq('template_id', templateId)
          .order('ordem');
        
        if (!isMounted) return;

        if (prodErr) {
          console.error('Erro ao buscar produtos:', prodErr);
          return;
        }

        if (data) {
          const prods = data as Product[];
          setTemplateProducts(prods);
          
          // Por padrão, seleciona todos os produtos do template
          const initialSelection: Record<string, number> = {};
          let totalSum = 0;
          prods.forEach((p) => {
            initialSelection[p.id] = 1;
            totalSum += p.valor;
          });
          setSelectedProducts(initialSelection);
          
          if (!isManualValueOverride) {
            setValor((totalSum * 100).toString());
          }
        }
      } catch (err) {
        console.error('Erro ao carregar produtos do template:', err);
      } finally {
        if (isMounted) {
          setLoadingProducts(false);
        }
      }
    }

    loadTemplateProducts();

    return () => {
      isMounted = false;
    };
  }, [templateId]);

  // Recalcula o valor total baseado nos produtos selecionados caso não tenha override manual
  useEffect(() => {
    if (isManualValueOverride || templateProducts.length === 0) return;

    let subtotal = 0;
    templateProducts.forEach((p) => {
      const qty = selectedProducts[p.id] || 0;
      subtotal += p.valor * qty;
    });

    setValor((subtotal * 100).toString());
  }, [selectedProducts, templateProducts, isManualValueOverride]);

  // Auto-fill tipoEvento ao selecionar template
  const handleTemplateChange = (id: string) => {
    setTemplateId(id);
    if (id) {
      const tpl = templates.find((t) => t.id === id);
      if (tpl && !tipoEvento) setTipoEvento(tpl.nome_template);
    }
  };

  const handleValorChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    setValor(digits);
    setIsManualValueOverride(true);
  };

  const resetManualValue = () => {
    setIsManualValueOverride(false);
    if (templateProducts.length > 0) {
      let subtotal = 0;
      templateProducts.forEach((p) => {
        const qty = selectedProducts[p.id] || 0;
        subtotal += p.valor * qty;
      });
      setValor((subtotal * 100).toString());
    } else {
      setValor('');
    }
  };

  const handleToggleProduct = (productId: string, checked: boolean) => {
    setSelectedProducts((prev) => {
      const next = { ...prev };
      if (checked) {
        next[productId] = 1;
      } else {
        delete next[productId];
      }
      return next;
    });
  };

  const handleQtyChange = (productId: string, qty: number) => {
    setSelectedProducts((prev) => ({
      ...prev,
      [productId]: Math.max(1, qty),
    }));
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
      // Monta priceBreakdown
      let subtotal = 0;
      templateProducts.forEach((p) => {
        const qty = selectedProducts[p.id] || 0;
        subtotal += p.valor * qty;
      });

      const priceBreakdown: PriceBreakdown = {
        subtotal: subtotal,
        ajusteSazonal: 0,
        ajusteGeografico: { percentual: 0, taxa: 0 },
        acrescimoFormaPagamento: 0,
        descontoCupom: 0,
        total: valorNumerico || subtotal,
      };

      const payload: Record<string, any> = {
        user_id: userId,
        nome_cliente: nome.trim(),
        email_cliente: email.trim() || null,
        telefone_cliente: telefone.trim() || null,
        template_id: templateId || null,
        tipo_evento: tipoEvento.trim() || null,
        data_evento: dataEvento || null,
        cidade_evento: cidade.trim() || null,
        valor_total: valorNumerico || subtotal || 0,
        status,
        origem: origem || 'manual',
        orcamento_detalhe: {
          notas: notas.trim() || null,
          origem_canal: origem,
          cadastro_manual: true,
          selectedProdutos: selectedProducts,
          produtos: templateProducts,
          priceBreakdown,
          customFields: [],
          customFieldsData: {},
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
      <div className="bg-white dark:bg-[#0a1628] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col border dark:border-[rgba(255,255,255,0.06)] overflow-hidden animate-in fade-in zoom-in-95 duration-150">

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
                  <div className="relative">
                    <input
                      type="date"
                      id="new-lead-data"
                      value={dataEvento}
                      onChange={(e) => setDataEvento(e.target.value)}
                      className={`${inputCls} pr-10`}
                    />
                    {checkingAvailability && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      </div>
                    )}
                  </div>
                  
                  {/* Status de Disponibilidade */}
                  {disponibilidade && (
                    <div className={`mt-2 flex items-center gap-1.5 p-2.5 rounded-lg border text-xs font-semibold ${
                      disponibilidade.status === 'disponivel'
                        ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-950/20 dark:border-green-900/50 dark:text-green-400'
                        : disponibilidade.status === 'parcial'
                        ? 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-950/20 dark:border-yellow-900/50 dark:text-yellow-400'
                        : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/20 dark:border-red-900/50 dark:text-red-400'
                    }`}>
                      {disponibilidade.status === 'disponivel' ? (
                        <Check className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span>{disponibilidade.mensagem} ({disponibilidade.eventos_atual}/{disponibilidade.eventos_max})</span>
                    </div>
                  )}
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

              {/* Seção de seleção de produtos do Template */}
              {templateId && (
                <div className="mt-3 p-3 bg-white dark:bg-[rgba(255,255,255,0.02)] rounded-xl border border-gray-100 dark:border-[rgba(255,255,255,0.06)]">
                  <label className="block text-xs font-bold text-gray-500 dark:text-[rgba(255,255,255,0.4)] uppercase tracking-wider mb-2">
                    Produtos / Pacotes do Template
                  </label>
                  
                  {loadingProducts ? (
                    <div className="py-4 flex justify-center items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                      <span className="text-xs text-gray-400">Carregando produtos...</span>
                    </div>
                  ) : templateProducts.length === 0 ? (
                    <p className="text-xs text-gray-400 italic py-1">Nenhum produto cadastrado neste template.</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {templateProducts.map((p) => {
                        const isSelected = !!selectedProducts[p.id];
                        const qty = selectedProducts[p.id] || 0;
                        return (
                          <div
                            key={p.id}
                            className={`flex items-center justify-between p-2 rounded-lg border text-sm transition-colors ${
                              isSelected
                                ? 'bg-indigo-50/50 border-indigo-150 dark:bg-indigo-950/10 dark:border-indigo-900/50'
                                : 'bg-gray-50 border-gray-100 dark:bg-transparent dark:border-[rgba(255,255,255,0.04)]'
                            }`}
                          >
                            <label className="flex items-center gap-2 cursor-pointer flex-1">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => handleToggleProduct(p.id, e.target.checked)}
                                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                              />
                              <div>
                                <span className="font-medium text-gray-700 dark:text-gray-300">{p.nome}</span>
                                <span className="text-xs text-gray-400 ml-2">
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.valor)}
                                </span>
                              </div>
                            </label>

                            {p.permite_multiplos && isSelected && (
                              <div className="flex items-center gap-1 bg-white dark:bg-[#07101f] border border-gray-200 dark:border-[rgba(255,255,255,0.1)] rounded-lg overflow-hidden shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleQtyChange(p.id, qty - 1)}
                                  className="px-2 py-0.5 bg-gray-50 dark:bg-transparent hover:bg-gray-100 dark:hover:bg-white/5 text-gray-600 dark:text-gray-300 text-xs font-bold"
                                >
                                  -
                                </button>
                                <span className="px-2 text-xs font-bold text-gray-700 dark:text-gray-300 min-w-[20px] text-center">
                                  {qty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleQtyChange(p.id, qty + 1)}
                                  className="px-2 py-0.5 bg-gray-50 dark:bg-transparent hover:bg-gray-100 dark:hover:bg-white/5 text-gray-600 dark:text-gray-300 text-xs font-bold"
                                >
                                  +
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold text-gray-500 dark:text-[rgba(255,255,255,0.5)] uppercase tracking-wider">
                    <DollarSign className="w-3 h-3 inline mr-1" /> Valor do Orçamento
                  </label>
                  {isManualValueOverride && (
                    <button
                      type="button"
                      onClick={resetManualValue}
                      className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                    >
                      <Info className="w-3 h-3" /> Resetar para soma dos produtos
                    </button>
                  )}
                </div>
                {isManualValueOverride && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mb-1">
                    ⚠️ Valor editado manualmente (sobrescreve cálculo do template)
                  </p>
                )}
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
                    className={`${inputCls} pl-9 font-semibold ${
                      isManualValueOverride
                        ? 'border-amber-400 bg-amber-50/30 text-amber-700 focus:ring-amber-500'
                        : 'text-indigo-600 dark:text-indigo-400 font-bold'
                    }`}
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
