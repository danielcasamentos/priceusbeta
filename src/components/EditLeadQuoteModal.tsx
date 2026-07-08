import { useState, useEffect } from 'react';
import { supabase, Lead } from '../lib/supabase';
import { LeadOrcamentoDetalhe } from './LeadsManager';
import { X, Save, RefreshCw, AlertCircle, ShoppingBag, User, MapPin, Calendar, Phone, DollarSign, Loader2, Check, AlertTriangle, ChevronDown } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { Product, PriceBreakdown } from '../lib/whatsappMessageGenerator';
import { checkAvailability, AvailabilityResult } from '../services/availabilityService';

interface EditLeadQuoteModalProps {
  lead: Lead;
  savedOrcamentoDetalhe: LeadOrcamentoDetalhe;
  onClose: () => void;
  onSave: (updatedData: Partial<Lead>) => void; // call to refresh parent Data
}

export function EditLeadQuoteModal({ lead, savedOrcamentoDetalhe, onClose, onSave }: EditLeadQuoteModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [formasPagamento, setFormasPagamento] = useState<any[]>([]);
  const [cidadesAjuste, setCidadesAjuste] = useState<any[]>([]);

  // ── Dados básicos do lead ────────────────────────────────────────────────
  const [nomeCliente, setNomeCliente] = useState(lead.nome_cliente || '');
  const [telefoneCliente, setTelefoneCliente] = useState(lead.telefone_cliente || '');
  const [dataEvento, setDataEvento] = useState(
    lead.data_evento ? lead.data_evento.split('T')[0] : ''
  );
  const [cidadeEvento, setCidadeEvento] = useState(lead.cidade_evento || '');

  // Cidades e Temporadas do Usuário
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
  const [temporadas, setTemporadas] = useState<any[]>([]);

  // Disponibilidade
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [disponibilidade, setDisponibilidade] = useState<AvailabilityResult | null>(null);

  // Cupom de Desconto
  const [cupomCodigo, setCupomCodigo] = useState((savedOrcamentoDetalhe as any).cupomCodigo || '');
  const [cupomAtivo, setCupomAtivo] = useState(!!(savedOrcamentoDetalhe as any).cupomAtivo);
  const [cupomDesconto, setCupomDesconto] = useState((savedOrcamentoDetalhe as any).cupomDesconto || 0);
  const [cupomMensagem, setCupomMensagem] = useState(
    (savedOrcamentoDetalhe as any).cupomAtivo
      ? `✅ Cupom ativo: ${(savedOrcamentoDetalhe as any).cupomDesconto}% de desconto`
      : ''
  );
  const [validandoCupom, setValidandoCupom] = useState(false);

  // ── Campos personalizados do orçamento ──────────────────────────────────
  const [customFieldsData, setCustomFieldsData] = useState<Record<string, string>>(
    savedOrcamentoDetalhe.customFieldsData || {}
  );
  const customFields = savedOrcamentoDetalhe.customFields || [];

  // ── Produtos e forma de pagamento ───────────────────────────────────────
  const [selectedProducts, setSelectedProducts] = useState<Record<string, number>>(
    savedOrcamentoDetalhe.selectedProdutos || {}
  );
  const [activeDiscounts, setActiveDiscounts] = useState<Record<string, boolean>>({});
  const initialForma =
    (savedOrcamentoDetalhe as any).selectedFormaPagamento ||
    savedOrcamentoDetalhe.forma_pagamento_id ||
    savedOrcamentoDetalhe.paymentMethod?.id ||
    '';
  const [selectedForma, setSelectedForma] = useState<string>(initialForma);

  // ── Upsell ──────────────────────────────────────────────────────────────
  const [upsellItems, setUpsellItems] = useState<any[]>(
    (savedOrcamentoDetalhe as any).upsell_produtos || []
  );
  const upsellSubtotal = upsellItems.reduce((acc, p) => {
    const baseVal = parseFloat(p.valor || 0);
    const desc = p.desconto_percentual || 0;
    return acc + baseVal * (1 - desc / 100) * (p.quantidade || 1);
  }, 0);

  const handleRemoveUpsellItem = (produtoId: string) => {
    setUpsellItems(prev => prev.filter(p => p.id !== produtoId));
  };

  // ── Recalculado em realtime ──────────────────────────────────────────────
  const [priceBreakdown, setPriceBreakdown] = useState<PriceBreakdown>(
    savedOrcamentoDetalhe.priceBreakdown || {
      subtotal: 0,
      ajusteSazonal: 0,
      ajusteGeografico: { percentual: 0, taxa: 0 },
      acrescimoFormaPagamento: 0,
      descontoCupom: 0,
      total: 0,
    }
  );

  // Override manual do valor total (arredondamento / desconto personalizado)
  const [manualTotalOverride, setManualTotalOverride] = useState<number | null>(null);
  const [manualTotalInput, setManualTotalInput] = useState('');

  const efectiveTotal = manualTotalOverride !== null ? manualTotalOverride : priceBreakdown.total;

  const handleManualTotalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    const num = Number(raw) / 100;
    setManualTotalInput(
      new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(num)
    );
    setManualTotalOverride(num);
  };

  const resetManualTotal = () => {
    setManualTotalOverride(null);
    setManualTotalInput('');
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const { data: prodData } = await supabase
        .from('produtos')
        .select('*')
        .eq('template_id', lead.template_id)
        .order('ordem', { ascending: true });
      
      if (prodData) {
        setAllProducts(prodData);
        
        // Initialize activeDiscounts based on savedOrcamentoDetalhe.produtos or default to true if template discount > 0
        const initialDiscounts: Record<string, boolean> = {};
        prodData.forEach((p) => {
          const savedProd = savedOrcamentoDetalhe?.produtos?.find((sp: any) => sp.id === p.id);
          if (savedProd && typeof savedProd.desconto_ativo !== 'undefined') {
            initialDiscounts[p.id] = savedProd.desconto_ativo;
          } else {
            initialDiscounts[p.id] = (p.desconto_percentual ?? 0) > 0;
          }
        });
        setActiveDiscounts(initialDiscounts);
      }

      const { data: formataData } = await supabase
        .from('formas_pagamento')
        .select('*')
        .eq('template_id', lead.template_id);
      if (formataData) setFormasPagamento(formataData);

      // Carregar estados do usuário
      const { data: estData } = await supabase
        .from('estados')
        .select('*')
        .eq('user_id', lead.user_id)
        .eq('ativo', true)
        .order('nome');
      if (estData) setEstados(estData);

      // Carregar países do usuário
      const { data: paisesData } = await supabase
        .from('paises')
        .select('*')
        .eq('user_id', lead.user_id)
        .eq('ativo', true)
        .order('nome');
      if (paisesData) setPaises(paisesData);

      // Carregar cidades do sistema geográfico do usuário
      const { data: cidData } = await supabase
        .from('cidades_ajuste')
        .select('*')
        .eq('user_id', lead.user_id)
        .eq('ativo', true)
        .order('nome');
      
      if (cidData) {
        setCidadesAjuste(cidData);
        const matched = cidData.find(c => 
          c.id === lead.cidade_evento || 
          c.nome.toLowerCase() === (lead.cidade_evento || '').toLowerCase()
        );
        if (matched) {
          setSelectedCidadeId(matched.id);
          setIsCustomCity(false);
          setCidadeEvento(matched.nome);
        } else if (lead.cidade_evento) {
          setSelectedCidadeId('custom');
          setIsCustomCity(true);
          setCustomCityName(lead.cidade_evento);
          const bp = savedOrcamentoDetalhe.priceBreakdown;
          const subtotal = bp?.subtotal || lead.valor_total || 0;
          const sazonal = bp?.ajusteSazonal || 0;
          const baseForGeo = subtotal + sazonal;
          const geoPercent = baseForGeo > 0 ? ((bp?.ajusteGeografico?.percentual || 0) / baseForGeo) * 100 : 0;
          setCustomCityPercent(Math.round(geoPercent).toString());
          setCustomCityTax((bp?.ajusteGeografico?.taxa || 0).toString());
        }
      }

      // Carregar temporadas
      const { data: tempRes } = await supabase
        .from('temporadas')
        .select('*')
        .eq('template_id', lead.template_id)
        .eq('ativo', true);
      if (tempRes) {
        setTemporadas(tempRes);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!dataEvento) {
      setDisponibilidade(null);
      return;
    }

    let isMounted = true;
    async function checkDate() {
      setCheckingAvailability(true);
      try {
        const res = await checkAvailability(lead.user_id, dataEvento);
        if (isMounted) {
          setDisponibilidade(res);
        }
      } catch (err) {
        console.error('Erro ao verificar disponibilidade no modal de edição:', err);
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
  }, [lead.user_id, dataEvento]);

  useEffect(() => {
    if (allProducts.length > 0) recalculateValues();
  }, [
    selectedProducts,
    selectedForma,
    allProducts,
    formasPagamento,
    activeDiscounts,
    selectedCidadeId,
    isCustomCity,
    customCityPercent,
    customCityTax,
    dataEvento,
    temporadas,
    cupomAtivo,
    cupomDesconto,
  ]);

  const recalculateValues = () => {
    const newSubtotal = allProducts.reduce((total, p) => {
      const qty = selectedProducts[p.id] || 0;
      const discountActive = activeDiscounts[p.id];
      const discountPercent = p.desconto_percentual ?? 0;
      const effectivePrice = (discountActive && discountPercent > 0)
        ? p.valor * (1 - discountPercent / 100)
        : p.valor;
      return total + effectivePrice * qty;
    }, 0);

    // 1. Ajuste Sazonal
    let newAjusteSazonal = 0;
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
        newAjusteSazonal = newSubtotal * (mult - 1);
      }
    }

    // 2. Ajuste Geográfico
    let geoPercentValue = 0;
    let newGeoPercentual = 0;
    let geoTaxaFixed = 0;

    if (isCustomCity) {
      geoPercentValue = parseFloat(customCityPercent) || 0;
      newGeoPercentual = ((newSubtotal + newAjusteSazonal) * geoPercentValue) / 100;
      geoTaxaFixed = parseFloat(customCityTax) || 0;
    } else if (selectedCidadeId) {
      const cidadeObj = cidadesAjuste.find((c) => c.id === selectedCidadeId);
      if (cidadeObj) {
        geoPercentValue = cidadeObj.ajuste_percentual || 0;
        newGeoPercentual = ((newSubtotal + newAjusteSazonal) * geoPercentValue) / 100;
        geoTaxaFixed = cidadeObj.taxa_deslocamento || 0;
      }
    }

    const totalAntesFormaPagamento =
      newSubtotal + newAjusteSazonal + newGeoPercentual + geoTaxaFixed;

    const paymentMethodObj = formasPagamento.find((f) => f.id === selectedForma);
    const acrescimoRatio = paymentMethodObj ? (paymentMethodObj.acrescimo || 0) / 100 : 0;
    const newAcrescimoFormaPagamento = totalAntesFormaPagamento * acrescimoRatio;

    let newDescontoCupom = 0;
    if (cupomAtivo && cupomDesconto > 0) {
      newDescontoCupom = (totalAntesFormaPagamento * cupomDesconto) / 100;
    }

    const newTotal = totalAntesFormaPagamento + newAcrescimoFormaPagamento - newDescontoCupom;

    setPriceBreakdown({
      subtotal: newSubtotal,
      ajusteSazonal: newAjusteSazonal,
      ajusteGeografico: { percentual: newGeoPercentual, taxa: geoTaxaFixed },
      acrescimoFormaPagamento: newAcrescimoFormaPagamento,
      descontoCupom: newDescontoCupom,
      total: newTotal,
    });
  };

  const handleToggleProduct = (productId: string, qtde: number) => {
    setSelectedProducts((prev) => {
      const novo = { ...prev };
      if (qtde <= 0) {
        delete novo[productId];
      } else {
        novo[productId] = qtde;
      }
      return novo;
    });
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
      if (data.template_id && lead.template_id && data.template_id !== lead.template_id) {
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

  const handleSave = async () => {
    setSaving(true);
    try {
      let finalCityName = cidadeEvento.trim() || null;

      if (isCustomCity && customCityName.trim()) {
        const nameTrimmed = customCityName.trim();
        if (salvarCidadeLista) {
          if (paises.length > 0 && !selectedPaisId) {
            alert('Por favor, selecione um país para salvar a cidade na sua lista de atuação.');
            setSaving(false);
            return;
          }
          const hasStatesForCountry = estados.some((e) => e.pais_id === selectedPaisId);
          if (hasStatesForCountry && !selectedEstadoId) {
            alert('Por favor, selecione um estado para salvar a cidade na sua lista de atuação.');
            setSaving(false);
            return;
          }
          const { data: newCity, error: cityErr } = await supabase
            .from('cidades_ajuste')
            .insert({
              user_id: lead.user_id,
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

      const novosDetalhes: LeadOrcamentoDetalhe = {
        ...savedOrcamentoDetalhe,
        selectedProdutos: selectedProducts,
        forma_pagamento_id: selectedForma,
        priceBreakdown: {
          ...priceBreakdown,
          total: efectiveTotal, // garante que o override é persistido
        },
        produtos: allProducts.map((p) => ({
          ...p,
          desconto_percentual: p.desconto_percentual ?? 0,
          desconto_ativo: !!activeDiscounts[p.id],
        })),
        paymentMethod: formasPagamento.find((f) => f.id === selectedForma),
        customFieldsData: customFieldsData,
        upsell_produtos: upsellItems,
        valor_base: efectiveTotal - upsellSubtotal,
        valor_upsell: upsellSubtotal,
        cupomCodigo: cupomAtivo ? cupomCodigo : null,
        cupomAtivo,
        cupomDesconto,
      } as any;

      const updatedLeadData: Partial<Lead> = {
        nome_cliente: nomeCliente || null,
        telefone_cliente: telefoneCliente || null,
        data_evento: dataEvento || null,
        cidade_evento: finalCityName,
        valor_total: efectiveTotal,
        orcamento_detalhe: novosDetalhes,
      };

      const { error } = await supabase
        .from('leads')
        .update(updatedLeadData)
        .eq('id', lead.id);

      if (error) throw error;

      onSave(updatedLeadData); // Dispara reload + update instantâneo no componente pai
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar as edições do lead.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-8 flex flex-col items-center">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mb-4" />
          <p className="text-gray-600 font-medium">Carregando dados do lead...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm shadow-2xl z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col animate-fade-in overflow-hidden">

        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-blue-600" />
              Editar Lead
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Altere os dados do cliente, pacotes e forma de pagamento
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 space-y-6">

          {/* ── Seção: Informações do Cliente ── */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h4 className="font-semibold text-gray-800 text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" />
              Informações do Cliente
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nome */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Nome do Cliente
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={nomeCliente}
                    onChange={(e) => setNomeCliente(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Nome completo"
                  />
                </div>
              </div>

              {/* Telefone */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Telefone / WhatsApp
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={telefoneCliente}
                    onChange={(e) => setTelefoneCliente(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>

              {/* Data do Evento */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Data do Evento
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    value={dataEvento}
                    onChange={(e) => setDataEvento(e.target.value)}
                    className="w-full pl-9 pr-10 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {checkingAvailability && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    </div>
                  )}
                </div>
                {disponibilidade && (
                  <div className={`mt-2 flex items-center gap-1.5 p-2.5 rounded-lg border text-xs font-semibold ${
                    disponibilidade.status === 'disponivel'
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : disponibilidade.status === 'parcial'
                      ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                      : 'bg-red-50 border-red-200 text-red-800'
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

              {/* Cidade */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Cidade do Evento
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  {cidadesAjuste.length > 0 ? (
                    <select
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
                          setCidadeEvento(chosen ? chosen.nome : '');
                        }
                      }}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                    >
                      <option value="">Selecione uma cidade padronizada...</option>
                      {cidadesAjuste.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome} {c.ajuste_percentual > 0 ? `(+${c.ajuste_percentual}%)` : ''} {c.taxa_deslocamento > 0 ? `(+R$ ${c.taxa_deslocamento})` : ''}
                        </option>
                      ))}
                      <option value="custom">+ Outra cidade (personalizar localidade)</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={cidadeEvento}
                      onChange={(e) => setCidadeEvento(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ex: São Paulo - SP"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Formulário de Cidade Customizada */}
            {isCustomCity && (
              <div className="p-4 bg-indigo-50/20 border border-indigo-150 rounded-xl space-y-3 mt-3 animate-fade-in">
                <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2">
                  📍 Configuração de Cidade Customizada
                </p>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nome da Cidade</label>
                  <input
                    type="text"
                    value={customCityName}
                    onChange={(e) => setCustomCityName(e.target.value)}
                    placeholder="Ex: Campinas - SP"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Ajuste Regional (%)</label>
                    <input
                      type="number"
                      min="0"
                      value={customCityPercent}
                      onChange={(e) => setCustomCityPercent(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Taxa de Deslocamento (R$)</label>
                    <input
                      type="number"
                      min="0"
                      value={customCityTax}
                      onChange={(e) => setCustomCityTax(e.target.value)}
                      placeholder="0,00"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-gray-700">
                    <input
                      type="checkbox"
                      checked={salvarCidadeLista}
                      onChange={(e) => setSalvarCidadeLista(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                    />
                    Salvar esta cidade na minha lista de atuação
                  </label>
                </div>
                {salvarCidadeLista && paises.length > 0 && (
                  <div className="grid grid-cols-2 gap-3 pt-1 animate-fade-in">
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-gray-600">País *</label>
                      <div className="relative">
                        <select
                          value={selectedPaisId}
                          onChange={(e) => {
                            setSelectedPaisId(e.target.value);
                            setSelectedEstadoId('');
                          }}
                          className="w-full pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white appearance-none"
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
                      <label className="block text-xs font-medium text-gray-600">Estado *</label>
                      <div className="relative">
                        <select
                          value={selectedEstadoId}
                          disabled={!selectedPaisId}
                          onChange={(e) => setSelectedEstadoId(e.target.value)}
                          className="w-full pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white appearance-none disabled:opacity-50"
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

            {/* ── Campos personalizados do template ── */}
            {customFields.length > 0 && (
              <div className="mt-5 pt-5 border-t border-gray-100">
                <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Campos Adicionais
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {customFields.map((field: any) => {
                    const fieldId = field.id || field.nome;
                    return (
                      <div key={fieldId}>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          {field.label || field.nome}
                        </label>
                        {field.tipo === 'select' && field.opcoes ? (
                          <select
                            value={customFieldsData[fieldId] || ''}
                            onChange={(e) =>
                              setCustomFieldsData((prev) => ({
                                ...prev,
                                [fieldId]: e.target.value,
                              }))
                            }
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">Selecione...</option>
                            {field.opcoes.map((op: string) => (
                              <option key={op} value={op}>{op}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={field.tipo === 'number' ? 'number' : 'text'}
                            value={customFieldsData[fieldId] || ''}
                            onChange={(e) =>
                              setCustomFieldsData((prev) => ({
                                ...prev,
                                [fieldId]: e.target.value,
                              }))
                            }
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder={field.placeholder || ''}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Seção: Produtos & Forma de Pagamento ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Esquerda: Lista de Produtos */}
            <div className="md:col-span-2 space-y-4">
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h4 className="font-semibold text-gray-800 text-sm uppercase tracking-wider mb-3 flex justify-between">
                  <span>Produtos &amp; Pacotes</span>
                  <span className="text-gray-400 font-normal">Qtd.</span>
                </h4>
                <div className="space-y-2">
                  {allProducts.map((p) => {
                    const qty = selectedProducts[p.id] || 0;
                    const isSelected = qty > 0;
                    return (
                      <div
                        key={p.id}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                          isSelected
                            ? 'border-blue-200 bg-blue-50/50'
                            : 'border-gray-100 bg-white hover:border-gray-200'
                        }`}
                      >
                        <div className="flex-1 pr-4">
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              id={`checkbox-prod-${p.id}`}
                              checked={isSelected}
                              onChange={(e) =>
                                handleToggleProduct(p.id, e.target.checked ? 1 : 0)
                              }
                              className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                            <div className="flex-1">
                              <label htmlFor={`checkbox-prod-${p.id}`} className={`font-medium cursor-pointer ${isSelected ? 'text-blue-900' : 'text-gray-700'}`}>
                                {p.nome}
                              </label>
                              <div className="flex items-center gap-2 mt-0.5">
                                {isSelected && p.desconto_percentual && p.desconto_percentual > 0 && activeDiscounts[p.id] ? (
                                  <>
                                    <span className="text-sm text-gray-400 line-through">
                                      {formatCurrency(p.valor)}
                                    </span>
                                    <span className="text-sm font-bold text-green-600">
                                      {formatCurrency(p.valor * (1 - p.desconto_percentual / 100))}
                                    </span>
                                    <span className="text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded font-medium">
                                      -{p.desconto_percentual}%
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-sm text-gray-500">{formatCurrency(p.valor)}</span>
                                )}
                              </div>

                              {/* Discount toggle checkbox */}
                              {isSelected && p.desconto_percentual && p.desconto_percentual > 0 && (
                                <div className="mt-2 flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-md p-1.5 w-fit">
                                  <input
                                    type="checkbox"
                                    id={`discount-toggle-${p.id}`}
                                    checked={activeDiscounts[p.id] || false}
                                    onChange={(e) => {
                                      setActiveDiscounts((prev) => ({
                                        ...prev,
                                        [p.id]: e.target.checked,
                                      }));
                                    }}
                                    className="w-3.5 h-3.5 text-green-600 rounded border-gray-300 focus:ring-green-500 cursor-pointer"
                                  />
                                  <label
                                    htmlFor={`discount-toggle-${p.id}`}
                                    className="text-xs text-gray-600 cursor-pointer select-none font-medium"
                                  >
                                    Aplicar desconto do template (-{p.desconto_percentual}%)
                                  </label>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {p.permite_multiplas_unidades && isSelected && (
                          <div className="flex items-center bg-white border border-blue-200 rounded-lg overflow-hidden shrink-0">
                            <button
                              onClick={() => handleToggleProduct(p.id, Math.max(1, qty - 1))}
                              className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium transition-colors"
                            >
                              -
                            </button>
                            <span className="px-3 py-1 text-sm font-bold text-gray-700 w-8 text-center">
                              {qty}
                            </span>
                            <button
                              onClick={() => handleToggleProduct(p.id, qty + 1)}
                              className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium transition-colors"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Seção de Cupom de Desconto */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h4 className="font-semibold text-gray-800 text-sm uppercase tracking-wider mb-3">
                  🎫 Cupom de Desconto
                </h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={cupomCodigo}
                    onChange={(e) => setCupomCodigo(e.target.value.toUpperCase())}
                    placeholder="DIGITE O CÓDIGO DO CUPOM"
                    className="flex-1 text-sm border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-gray-50 px-3 py-2"
                  />
                  <button
                    type="button"
                    onClick={handleValidarCupom}
                    disabled={validandoCupom}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition-colors shrink-0 disabled:opacity-50"
                  >
                    {validandoCupom ? 'Validando...' : 'Aplicar'}
                  </button>
                </div>
                {cupomMensagem && (
                  <p className={`text-xs font-semibold mt-2 ${cupomAtivo ? 'text-green-600' : 'text-red-500'}`}>
                    {cupomMensagem}
                  </p>
                )}
              </div>

              {formasPagamento.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <h4 className="font-semibold text-gray-800 text-sm uppercase tracking-wider mb-3">
                    Forma de Pagamento
                  </h4>
                  <select
                    value={selectedForma}
                    onChange={(e) => setSelectedForma(e.target.value)}
                    className="w-full text-sm border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-gray-50 px-3 py-2"
                  >
                    <option value="">Personalizada / Não definida</option>
                    {formasPagamento.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.nome} {f.acrescimo > 0 ? `(+${f.acrescimo}%)` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* ── Seção Upsell ── */}
              {upsellItems.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                  <h4 className="font-semibold text-amber-900 text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span>🎁</span> Adicionais Contratados (Upsell)
                  </h4>
                  <div className="space-y-2">
                    {upsellItems.map((p) => {
                      const baseVal = parseFloat(p.valor || 0);
                      const desc = p.desconto_percentual || 0;
                      const precoFinal = baseVal * (1 - desc / 100);
                      return (
                        <div
                          key={p.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-white border border-amber-100"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium text-amber-900">{p.nome}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {desc > 0 && (
                                <span className="text-xs text-gray-400 line-through">
                                  {formatCurrency(baseVal)}
                                </span>
                              )}
                              <span className="text-sm font-bold text-amber-700">
                                {formatCurrency(precoFinal)}
                                {desc > 0 && (
                                  <span className="text-xs ml-1 text-green-600 font-normal">(-{desc}%)</span>
                                )}
                              </span>
                              {p.quantidade > 1 && (
                                <span className="text-xs text-gray-500">x {p.quantidade}</span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveUpsellItem(p.id)}
                            className="ml-3 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remover adicional"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-amber-700 mt-3 font-medium">
                    Subtotal dos adicionais: {formatCurrency(upsellSubtotal)}
                  </p>
                </div>
              )}
            </div>

            {/* Direita: Resumo Recalculado */}
            <div className="md:col-span-1">
              <div className="bg-white border border-gray-200 rounded-xl p-5 sticky top-4 shadow-sm">
                <h4 className="font-bold text-gray-900 mb-4 border-b pb-2">Resumo recalculado</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>{formatCurrency(priceBreakdown.subtotal)}</span>
                  </div>

                  {priceBreakdown.ajusteSazonal !== 0 && (
                    <div className="flex justify-between text-yellow-600">
                      <span>Ajuste Sazonal</span>
                      <span>
                        {priceBreakdown.ajusteSazonal > 0 ? '+' : ''}
                        {formatCurrency(priceBreakdown.ajusteSazonal)}
                      </span>
                    </div>
                  )}

                  {((priceBreakdown.ajusteGeografico?.percentual ?? 0) !== 0 ||
                    (priceBreakdown.ajusteGeografico?.taxa ?? 0) !== 0) && (
                    <div className="flex justify-between text-indigo-600">
                      <span>Ajuste Geográfico</span>
                      <span>
                        +
                        {formatCurrency(
                          (priceBreakdown.ajusteGeografico?.percentual || 0) +
                            (priceBreakdown.ajusteGeografico?.taxa || 0)
                        )}
                      </span>
                    </div>
                  )}

                  {priceBreakdown.acrescimoFormaPagamento > 0 && (
                    <div className="flex justify-between text-gray-500">
                      <span>Taxa Pagamento</span>
                      <span>+{formatCurrency(priceBreakdown.acrescimoFormaPagamento)}</span>
                    </div>
                  )}

                  {priceBreakdown.descontoCupom > 0 && (
                    <div className="flex justify-between text-green-600 font-medium">
                      <span>Desconto Cupom {cupomDesconto > 0 ? `(${cupomDesconto}%)` : ''}</span>
                      <span>-{formatCurrency(priceBreakdown.descontoCupom)}</span>
                    </div>
                  )}

                  <div className="border-t pt-3 mt-4">
                    {upsellSubtotal > 0 && (
                      <div className="flex justify-between text-amber-600 mb-2 text-sm font-medium">
                        <span>🎁 Adicionais</span>
                        <span>+{formatCurrency(upsellSubtotal)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-gray-900 text-base">Total Final</span>
                      {manualTotalOverride !== null && (
                        <button
                          type="button"
                          onClick={resetManualTotal}
                          className="text-xs text-blue-500 hover:text-blue-700 underline"
                        >
                          Resetar
                        </button>
                      )}
                    </div>
                    {manualTotalOverride !== null && (
                      <p className="text-xs text-amber-600 font-medium mb-1">⚠️ Valor ajustado manualmente</p>
                    )}
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">R$</span>
                      <input
                        type="text"
                        value={manualTotalOverride !== null
                          ? manualTotalInput
                          : new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(priceBreakdown.total)
                        }
                        onChange={handleManualTotalChange}
                        onFocus={(e) => {
                          if (manualTotalOverride === null) {
                            const raw = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(priceBreakdown.total);
                            setManualTotalInput(raw);
                            setManualTotalOverride(priceBreakdown.total);
                          }
                          e.target.select();
                        }}
                        className={`w-full pl-8 pr-2 py-2 text-right text-xl font-black rounded-lg border focus:ring-2 focus:ring-blue-500 ${
                          manualTotalOverride !== null
                            ? 'border-amber-400 bg-amber-50 text-amber-700'
                            : 'border-gray-200 bg-white text-blue-600'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 bg-blue-50 p-3 rounded-lg border border-blue-100 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-800">
                  Ao salvar, todos os dados do lead e o valor total serão atualizados e refletidos
                  em contratos e mensagens de WhatsApp.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white border-t px-6 py-4 flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>
    </div>
  );
}
