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

  // Cidades e Temporadas do Usuário
  const [cidadesAjuste, setCidadesAjuste] = useState<any[]>([]);
  const [temporadas, setTemporadas] = useState<any[]>([]);
  
  // Controle de cidade personalizada
  const [selectedCidadeId, setSelectedCidadeId] = useState<string>('');
  const [isCustomCity, setIsCustomCity] = useState(false);
  const [customCityName, setCustomCityName] = useState('');
  const [customCityPercent, setCustomCityPercent] = useState('0');
  const [customCityTax, setCustomCityTax] = useState('0');
  const [salvarCidadeLista, setSalvarCidadeLista] = useState(false);
  const [estados, setEstados] = useState<any[]>([]);
  const [selectedEstadoId, setSelectedEstadoId] = useState<string>('');
  const [paises, setPaises] = useState<any[]>([]);
  const [selectedPaisId, setSelectedPaisId] = useState<string>('');

  // Ajustes Manuais
  const [descontoManual, setDescontoManual] = useState('0');
  const [acrescimoManual, setAcrescimoManual] = useState('0');

  // Cupom de Desconto
  const [cupomCodigo, setCupomCodigo] = useState('');
  const [cupomAtivo, setCupomAtivo] = useState(false);
  const [cupomDesconto, setCupomDesconto] = useState(0);
  const [cupomMensagem, setCupomMensagem] = useState('');
  const [validandoCupom, setValidandoCupom] = useState(false);

  // Disponibilidade
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [disponibilidade, setDisponibilidade] = useState<AvailabilityResult | null>(null);

  // Produtos do template
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [templateProducts, setTemplateProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Record<string, number>>({});
  const [isManualValueOverride, setIsManualValueOverride] = useState(false);

  // Upsell
  const [upsellProducts, setUpsellProducts] = useState<Product[]>([]);
  const [selectedUpsellProducts, setSelectedUpsellProducts] = useState<Record<string, boolean>>({});
  const [hasUpsell, setHasUpsell] = useState(false);
  const upsellSubtotal = upsellProducts.reduce((acc, p) => {
    if (!selectedUpsellProducts[p.id]) return acc;
    const desc = (p as any).desconto_percentual || 0;
    return acc + p.valor * (1 - desc / 100);
  }, 0);

  // Carrega templates e cidades ao abrir
  useEffect(() => {
    async function loadInitialData() {
      try {
        const { data: templatesData } = await supabase
          .from('templates')
          .select('id, nome_template')
          .eq('user_id', userId)
          .order('nome_template');
        if (templatesData) setTemplates(templatesData);

        const { data: cidadesData } = await supabase
          .from('cidades_ajuste')
          .select('*')
          .eq('user_id', userId)
          .eq('ativo', true)
          .order('nome');
        if (cidadesData) setCidadesAjuste(cidadesData);

        const { data: estData } = await supabase
          .from('estados')
          .select('*')
          .eq('user_id', userId)
          .eq('ativo', true)
          .order('nome');
        if (estData) setEstados(estData);

        const { data: paisesData } = await supabase
          .from('paises')
          .select('*')
          .eq('user_id', userId)
          .eq('ativo', true)
          .order('nome');
        if (paisesData) setPaises(paisesData);
      } catch (err) {
        console.error('Erro ao carregar dados iniciais do modal:', err);
      }
    }
    loadInitialData();
  }, [userId]);

  // Carrega temporadas do template selecionado
  useEffect(() => {
    if (!templateId) {
      setTemporadas([]);
      return;
    }
    async function loadTemporadas() {
      const { data } = await supabase
        .from('temporadas')
        .select('*')
        .eq('template_id', templateId)
        .eq('ativo', true)
        .order('data_inicio');
      if (data) setTemporadas(data);
    }
    loadTemporadas();
  }, [templateId]);

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
      setUpsellProducts([]);
      setSelectedUpsellProducts({});
      setHasUpsell(false);
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
          prods.forEach((p) => {
            initialSelection[p.id] = 1;
          });
          setSelectedProducts(initialSelection);
        }

        // Verificar se o template tem upsell configurado
        const { data: templateData } = await supabase
          .from('templates')
          .select('upsell_ativo, upsell_template_id, upsell_produtos_ids')
          .eq('id', templateId)
          .maybeSingle();

        if (!isMounted) return;

        if (templateData?.upsell_ativo && templateData.upsell_template_id && templateData.upsell_produtos_ids?.length > 0) {
          setHasUpsell(true);
          const { data: upsellData } = await supabase
            .from('produtos')
            .select('*')
            .in('id', templateData.upsell_produtos_ids);
          if (isMounted && upsellData) {
            setUpsellProducts(upsellData as Product[]);
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

  // Cálculo de valores em tempo real
  const calculateTotals = () => {
    let subtotal = 0;
    templateProducts.forEach((p) => {
      const qty = selectedProducts[p.id] || 0;
      subtotal += p.valor * qty;
    });

    // 1. Ajuste Sazonal
    let ajusteSazonal = 0;
    let seasonalPercent = 0;
    if (dataEvento && temporadas.length > 0) {
      const parts = dataEvento.split('-');
      const evDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      const tempAtiva = temporadas.find((temp) => {
        const dIni = temp.data_inicio.split('T')[0].split('-');
        const dFim = temp.data_fim.split('T')[0].split('-');
        const ini = new Date(parseInt(dIni[0]), parseInt(dIni[1]) - 1, parseInt(dIni[2]));
        const fim = new Date(parseInt(dFim[0]), parseInt(dFim[1]) - 1, parseInt(dFim[2]));
        return evDate >= ini && evDate <= fim;
      });
      if (tempAtiva) {
        const mult = tempAtiva.multiplicador || 1;
        ajusteSazonal = subtotal * (mult - 1);
        seasonalPercent = Math.round((mult - 1) * 100);
      }
    }

    // 2. Ajuste Geográfico
    let geoPercentual = 0;
    let geoTaxa = 0;
    let geoPercentValue = 0;

    if (isCustomCity) {
      geoPercentValue = parseFloat(customCityPercent) || 0;
      geoPercentual = ((subtotal + ajusteSazonal) * geoPercentValue) / 100;
      geoTaxa = parseFloat(customCityTax) || 0;
    } else if (selectedCidadeId) {
      const cidadeObj = cidadesAjuste.find((c) => c.id === selectedCidadeId);
      if (cidadeObj) {
        geoPercentValue = cidadeObj.ajuste_percentual || 0;
        geoPercentual = ((subtotal + ajusteSazonal) * geoPercentValue) / 100;
        geoTaxa = cidadeObj.taxa_deslocamento || 0;
      }
    }

    const manualDesc = parseFloat(descontoManual) || 0;
    const manualAcres = parseFloat(acrescimoManual) || 0;

    let descontoCupomValor = 0;
    if (cupomAtivo && cupomDesconto > 0) {
      descontoCupomValor = ((subtotal + ajusteSazonal + geoPercentual + geoTaxa) * cupomDesconto) / 100;
    }

    const baseCalculatedTotal = subtotal + ajusteSazonal + geoPercentual + geoTaxa + manualAcres - manualDesc - descontoCupomValor;

    return {
      subtotal,
      ajusteSazonal,
      seasonalPercent,
      geoPercentual,
      geoPercentValue,
      geoTaxa,
      manualDesc,
      manualAcres,
      descontoCupomValor,
      total: Math.max(0, baseCalculatedTotal),
    };
  };

  const calculated = calculateTotals();

  // Recalcula o valor total baseado nos produtos selecionados caso não tenha override manual
  useEffect(() => {
    if (isManualValueOverride) return;
    setValor((calculated.total * 100).toString());
  }, [selectedProducts, templateProducts, isManualValueOverride, dataEvento, temporadas, selectedCidadeId, isCustomCity, customCityPercent, customCityTax, descontoManual, acrescimoManual, cupomAtivo, cupomDesconto]);

  // Auto-fill tipoEvento ao selecionar template
  const handleTemplateChange = (id: string) => {
    setTemplateId(id);
    setCupomCodigo('');
    setCupomAtivo(false);
    setCupomDesconto(0);
    setCupomMensagem('');
    if (id) {
      const tpl = templates.find((t) => t.id === id);
      if (tpl && !tipoEvento) setTipoEvento(tpl.nome_template);
    }
  };

  const handleValidarCupom = async () => {
    if (!cupomCodigo.trim()) {
      setCupomMensagem('Digite um código de cupom');
      return;
    }
    setValidandoCupom(true);
    setCupomMensagem('');
    try {
      const { data, error } = await supabase
        .from('cupons')
        .select('*')
        .eq('codigo', cupomCodigo.toUpperCase())
        .eq('ativo', true)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setCupomMensagem('❌ Cupom inválido ou inativo');
        setCupomAtivo(false);
        setCupomDesconto(0);
        return;
      }

      // Se tiver data_validade, verifica
      if (data.data_validade) {
        const validade = new Date(data.data_validade);
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        if (validade < hoje) {
          setCupomMensagem('❌ Cupom expirado');
          setCupomAtivo(false);
          setCupomDesconto(0);
          return;
        }
      }

      // Se tiver template_id, verifica se bate
      if (data.template_id && templateId && data.template_id !== templateId) {
        setCupomMensagem('❌ Cupom não aplicável a este template');
        setCupomAtivo(false);
        setCupomDesconto(0);
        return;
      }

      setCupomAtivo(true);
      setCupomDesconto(data.porcentagem || 0);
      setCupomMensagem(`✅ Cupom aplicado: ${data.porcentagem}% de desconto!`);
    } catch (err) {
      console.error('Erro ao validar cupom:', err);
      setCupomMensagem('❌ Erro ao validar cupom');
      setCupomAtivo(false);
      setCupomDesconto(0);
    } finally {
      setValidandoCupom(false);
    }
  };

  const handleValorChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    setValor(digits);
    setIsManualValueOverride(true);
  };

  const resetManualValue = () => {
    setIsManualValueOverride(false);
    setValor((calculated.total * 100).toString());
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
      const effectiveTotal = isManualValueOverride ? valorNumerico : calculated.total;
      
      const priceBreakdown: PriceBreakdown = {
        subtotal: calculated.subtotal,
        ajusteSazonal: calculated.ajusteSazonal,
        ajusteGeografico: { percentual: calculated.geoPercentual, taxa: calculated.geoTaxa },
        acrescimoFormaPagamento: calculated.manualAcres,
        descontoCupom: calculated.manualDesc + calculated.descontoCupomValor,
        total: effectiveTotal,
      };

      let finalCityName = cidade.trim() || null;

      if (isCustomCity && customCityName.trim()) {
        const nameTrimmed = customCityName.trim();
        if (salvarCidadeLista) {
          if (paises.length > 0 && !selectedPaisId) {
            setError('Por favor, selecione um país para salvar a cidade na sua lista de atuação.');
            setSaving(false);
            return;
          }
          const hasStatesForCountry = estados.some((e) => e.pais_id === selectedPaisId);
          if (hasStatesForCountry && !selectedEstadoId) {
            setError('Por favor, selecione um estado para salvar a cidade na sua lista de atuação.');
            setSaving(false);
            return;
          }
          const { data: newCity, error: cityErr } = await supabase
            .from('cidades_ajuste')
            .insert({
              user_id: userId,
              estado_id: selectedEstadoId || null,
              nome: nameTrimmed,
              ajuste_percentual: parseFloat(customCityPercent) || 0,
              taxa_deslocamento: parseFloat(customCityTax) || 0,
              ativo: true
            })
            .select()
            .single();

          if (cityErr) {
            console.error('Erro ao salvar cidade na lista:', cityErr);
          } else if (newCity) {
            finalCityName = newCity.id;
          }
        } else {
          finalCityName = nameTrimmed;
        }
      } else if (selectedCidadeId && selectedCidadeId !== 'custom') {
        finalCityName = selectedCidadeId;
      }

      const payload: Record<string, any> = {
        user_id: userId,
        nome_cliente: nome.trim(),
        email_cliente: email.trim() || null,
        telefone_cliente: telefone.trim() || null,
        template_id: templateId || null,
        tipo_evento: tipoEvento.trim() || null,
        data_evento: dataEvento || null,
        cidade_evento: finalCityName,
        valor_total: effectiveTotal + upsellSubtotal,
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
          upsell_produtos: upsellProducts
            .filter(p => selectedUpsellProducts[p.id])
            .map(p => ({
              id: p.id,
              nome: p.nome,
              valor: p.valor,
              desconto_percentual: (p as any).desconto_percentual || 0,
              imagem_url: (p as any).imagem_url || '',
              quantidade: 1,
            })),
          valor_base: effectiveTotal,
          valor_upsell: upsellSubtotal,
          cupomCodigo: cupomAtivo ? cupomCodigo : null,
          cupomAtivo,
          cupomDesconto,
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
                  <div className="relative">
                    <select
                      id="new-lead-cidade-select"
                      value={isCustomCity ? 'custom' : selectedCidadeId}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'custom') {
                          setIsCustomCity(true);
                          setSelectedCidadeId('');
                        } else {
                          setIsCustomCity(false);
                          setSelectedCidadeId(val);
                          const chosen = cidadesAjuste.find(c => c.id === val);
                          setCidade(chosen ? chosen.nome : '');
                        }
                      }}
                      className={`${inputCls} pr-8 appearance-none`}
                    >
                      <option value="">Selecione uma cidade padronizada...</option>
                      {cidadesAjuste.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome} {c.ajuste_percentual > 0 ? `(+${c.ajuste_percentual}%)` : ''} {c.taxa_deslocamento > 0 ? `(+R$ ${c.taxa_deslocamento})` : ''}
                        </option>
                      ))}
                      <option value="custom">+ Outra cidade (personalizar localidade)</option>
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Formulário de Cidade Customizada */}
              {isCustomCity && (
                <div className="p-4 bg-indigo-50/20 dark:bg-indigo-950/10 border border-indigo-150 dark:border-indigo-900/30 rounded-xl space-y-3 mt-2 animate-in slide-in-from-top-1 duration-200">
                  <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2">
                    📍 Configuração de Cidade Customizada
                  </p>
                  <div>
                    <label className={labelCls}>Nome da Cidade</label>
                    <input
                      type="text"
                      value={customCityName}
                      onChange={(e) => setCustomCityName(e.target.value)}
                      placeholder="Ex: Campinas - SP"
                      className={inputCls}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Ajuste Regional (%)</label>
                      <input
                        type="number"
                        min="0"
                        value={customCityPercent}
                        onChange={(e) => setCustomCityPercent(e.target.value)}
                        placeholder="0"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Taxa de Deslocamento (R$)</label>
                      <input
                        type="number"
                        min="0"
                        value={customCityTax}
                        onChange={(e) => setCustomCityTax(e.target.value)}
                        placeholder="0,00"
                        className={inputCls}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={salvarCidadeLista}
                        onChange={(e) => setSalvarCidadeLista(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer bg-white dark:bg-white/5"
                      />
                      Salvar esta cidade na minha lista de atuação
                    </label>
                  </div>
                  {salvarCidadeLista && paises.length > 0 && (
                    <div className="grid grid-cols-2 gap-3 pt-1 animate-in slide-in-from-top-1 duration-200">
                      <div className="space-y-1">
                        <label className={labelCls}>País *</label>
                        <div className="relative">
                          <select
                            value={selectedPaisId}
                            onChange={(e) => {
                              setSelectedPaisId(e.target.value);
                              setSelectedEstadoId('');
                            }}
                            className="w-full pl-3 pr-8 py-2 text-sm border border-gray-350 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-[#0c192e] text-gray-800 dark:text-gray-200 appearance-none"
                          >
                            <option value="">Selecione...</option>
                            {paises.map((p) => (
                              <option key={p.id} value={p.id}>{p.nome}</option>
                            ))}
                          </select>
                          <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className={labelCls}>Estado *</label>
                        <div className="relative">
                          <select
                            value={selectedEstadoId}
                            disabled={!selectedPaisId}
                            onChange={(e) => setSelectedEstadoId(e.target.value)}
                            className="w-full pl-3 pr-8 py-2 text-sm border border-gray-350 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-[#0c192e] text-gray-800 dark:text-gray-200 appearance-none disabled:opacity-50"
                          >
                            <option value="">Selecione...</option>
                            {estados
                              .filter((e) => e.pais_id === selectedPaisId)
                              .map((e) => (
                                <option key={e.id} value={e.id}>{e.nome} ({e.sigla})</option>
                              ))}
                          </select>
                          <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

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

                            {p.permite_multiplas_unidades && isSelected && (
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

              {/* Seção de Upsell */}
              {hasUpsell && upsellProducts.length > 0 && (
                <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-100 dark:border-amber-900/30">
                  <label className="block text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-2">
                    🎁 Adicionais Opcionais (Upsell)
                  </label>
                  <div className="space-y-2">
                    {upsellProducts.map((p) => {
                      const desc = (p as any).desconto_percentual || 0;
                      const precoFinal = p.valor * (1 - desc / 100);
                      const isSelected = !!selectedUpsellProducts[p.id];
                      return (
                        <div
                          key={p.id}
                          className={`flex items-center justify-between p-2 rounded-lg border text-sm transition-colors ${
                            isSelected
                              ? 'bg-amber-100/50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/50'
                              : 'bg-white border-gray-100 dark:bg-transparent dark:border-[rgba(255,255,255,0.04)]'
                          }`}
                        >
                          <label className="flex items-center gap-2 cursor-pointer flex-1">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => setSelectedUpsellProducts(prev => ({...prev, [p.id]: e.target.checked}))}
                              className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                            />
                            <div>
                              <span className="font-medium text-gray-700 dark:text-gray-300">{p.nome}</span>
                              <div className="flex items-center gap-1.5 text-xs">
                                {desc > 0 && (
                                  <span className="text-gray-400 line-through">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.valor)}
                                  </span>
                                )}
                                <span className="text-amber-700 font-semibold">
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(precoFinal)}
                                </span>
                                {desc > 0 && (
                                  <span className="text-green-600 bg-green-50 px-1 py-0.5 rounded font-medium">-{desc}%</span>
                                )}
                              </div>
                            </div>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                  {upsellSubtotal > 0 && (
                    <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold mt-2">
                      Adicionais selecionados: +{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(upsellSubtotal)}
                    </p>
                  )}
                </div>
              )}

              {/* Seção de Cupom de Desconto */}
              <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-[rgba(255,255,255,0.05)] space-y-2">
                <label className={labelCls}>🎫 Cupom de Desconto</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={cupomCodigo}
                    onChange={(e) => setCupomCodigo(e.target.value.toUpperCase())}
                    placeholder="DIGITE O CÓDIGO DO CUPOM"
                    className={`${inputCls} flex-1`}
                  />
                  <button
                    type="button"
                    onClick={handleValidarCupom}
                    disabled={validandoCupom}
                    className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors shrink-0 disabled:opacity-50"
                  >
                    {validandoCupom ? 'Validando...' : 'Aplicar'}
                  </button>
                </div>
                {cupomMensagem && (
                  <p className={`text-xs font-semibold ${cupomAtivo ? 'text-green-600' : 'text-red-500'}`}>
                    {cupomMensagem}
                  </p>
                )}
              </div>

              {/* Ajustes e Descontos Manuais */}
              <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-[rgba(255,255,255,0.05)] space-y-3">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  💸 Descontos e Acréscimos Manuais
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Acréscimo Manual / Taxas (R$)</label>
                    <input
                      type="number"
                      min="0"
                      value={acrescimoManual}
                      onChange={(e) => setAcrescimoManual(e.target.value)}
                      placeholder="0,00"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Desconto Manual / Cupom (R$)</label>
                    <input
                      type="number"
                      min="0"
                      value={descontoManual}
                      onChange={(e) => setDescontoManual(e.target.value)}
                      placeholder="0,00"
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>

              {/* Resumo e Cálculo Final */}
              <div className="p-4 bg-indigo-50/30 dark:bg-white/5 rounded-xl border border-indigo-100 dark:border-[rgba(255,255,255,0.08)]">
                <p className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider mb-2">
                  📝 Detalhamento de Cálculo (Breakdown)
                </p>
                <div className="text-xs space-y-1.5 text-gray-600 dark:text-[rgba(255,255,255,0.7)]">
                  <div className="flex justify-between">
                    <span>Subtotal dos Produtos:</span>
                    <span className="font-semibold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calculated.subtotal)}</span>
                  </div>
                  
                  {calculated.ajusteSazonal !== 0 && (
                    <div className="flex justify-between text-amber-700 dark:text-amber-400 font-semibold">
                      <span>Ajuste Sazonal ({calculated.seasonalPercent}%):</span>
                      <span>+{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calculated.ajusteSazonal)}</span>
                    </div>
                  )}

                  {(calculated.geoPercentual > 0 || calculated.geoTaxa > 0) && (
                    <div className="flex justify-between text-indigo-600 dark:text-blue-400">
                      <span>Ajuste Reg. / Deslocamento ({calculated.geoPercentValue}% + Taxa):</span>
                      <span className="font-semibold">+{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calculated.geoPercentual + calculated.geoTaxa)}</span>
                    </div>
                  )}

                  {calculated.manualAcres > 0 && (
                    <div className="flex justify-between text-gray-500 font-semibold">
                      <span>Acréscimo Manual:</span>
                      <span>+{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calculated.manualAcres)}</span>
                    </div>
                  )}

                  {calculated.manualDesc > 0 && (
                    <div className="flex justify-between text-green-600 font-semibold">
                      <span>Desconto Manual:</span>
                      <span>-{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calculated.manualDesc)}</span>
                    </div>
                  )}

                  {calculated.descontoCupomValor > 0 && (
                    <div className="flex justify-between text-green-600 font-semibold">
                      <span>Desconto Cupom ({cupomDesconto}%):</span>
                      <span>-{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calculated.descontoCupomValor)}</span>
                    </div>
                  )}

                  {upsellSubtotal > 0 && (
                    <div className="flex justify-between text-amber-600 dark:text-amber-300 font-bold border-t border-dashed border-gray-200 dark:border-white/10 pt-1 mt-1">
                      <span>🎁 Adicionais (Upsell):</span>
                      <span>+{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(upsellSubtotal)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm font-black text-gray-900 dark:text-white border-t border-gray-200 dark:border-white/10 pt-2 mt-2">
                    <span>Valor Calculado Total:</span>
                    <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calculated.total + upsellSubtotal)}</span>
                  </div>
                </div>
              </div>

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
                      <Info className="w-3 h-3" /> Resetar para soma calculada
                    </button>
                  )}
                </div>
                {isManualValueOverride && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mb-1">
                    ⚠️ Valor editado manualmente (sobrescreve cálculo automático)
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
