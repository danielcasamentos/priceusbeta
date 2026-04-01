import { useState, useEffect } from 'react';
import { supabase, Lead } from '../lib/supabase';
import { LeadOrcamentoDetalhe } from './LeadsManager';
import { X, Save, RefreshCw, AlertCircle, ShoppingBag, User, MapPin, Calendar, Phone } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { Product, PriceBreakdown } from '../lib/whatsappMessageGenerator';

interface EditLeadQuoteModalProps {
  lead: Lead;
  savedOrcamentoDetalhe: LeadOrcamentoDetalhe;
  onClose: () => void;
  onSave: () => void; // call to refresh parent Data
}

export function EditLeadQuoteModal({ lead, savedOrcamentoDetalhe, onClose, onSave }: EditLeadQuoteModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [formasPagamento, setFormasPagamento] = useState<any[]>([]);

  // ── Dados básicos do lead ────────────────────────────────────────────────
  const [nomeCliente, setNomeCliente] = useState(lead.nome_cliente || '');
  const [telefoneCliente, setTelefoneCliente] = useState(lead.telefone_cliente || '');
  const [dataEvento, setDataEvento] = useState(
    lead.data_evento ? lead.data_evento.split('T')[0] : ''
  );
  const [cidadeEvento, setCidadeEvento] = useState(lead.cidade_evento || '');

  // ── Campos personalizados do orçamento ──────────────────────────────────
  const [customFieldsData, setCustomFieldsData] = useState<Record<string, string>>(
    savedOrcamentoDetalhe.customFieldsData || {}
  );
  const customFields = savedOrcamentoDetalhe.customFields || [];

  // ── Produtos e forma de pagamento ───────────────────────────────────────
  const [selectedProducts, setSelectedProducts] = useState<Record<string, number>>(
    savedOrcamentoDetalhe.selectedProdutos || {}
  );
  const initialForma =
    (savedOrcamentoDetalhe as any).selectedFormaPagamento ||
    savedOrcamentoDetalhe.forma_pagamento_id ||
    savedOrcamentoDetalhe.paymentMethod?.id ||
    '';
  const [selectedForma, setSelectedForma] = useState<string>(initialForma);

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
      if (prodData) setAllProducts(prodData);

      const { data: formataData } = await supabase
        .from('formas_pagamento')
        .select('*')
        .eq('template_id', lead.template_id);
      if (formataData) setFormasPagamento(formataData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (allProducts.length > 0) recalculateValues();
  }, [selectedProducts, selectedForma, allProducts, formasPagamento]);

  const recalculateValues = () => {
    const ob = savedOrcamentoDetalhe.priceBreakdown || {
      subtotal: lead.valor_total || 0,
      ajusteSazonal: 0,
      ajusteGeografico: { percentual: 0, taxa: 0 },
      acrescimoFormaPagamento: 0,
      descontoCupom: 0,
      total: lead.valor_total || 0,
    };

    const seasonalRatio = ob.subtotal > 0 ? (ob.ajusteSazonal || 0) / ob.subtotal : 0;
    const baseForGeo = ob.subtotal + (ob.ajusteSazonal || 0);
    const geoPercentageRatio =
      baseForGeo > 0 ? (ob.ajusteGeografico?.percentual || 0) / baseForGeo : 0;

    const newSubtotal = allProducts.reduce((total, p) => {
      const qty = selectedProducts[p.id] || 0;
      return total + p.valor * qty;
    }, 0);

    const newAjusteSazonal = newSubtotal * seasonalRatio;
    const newGeoPercentual = (newSubtotal + newAjusteSazonal) * geoPercentageRatio;
    const geoTaxaFixed = ob.ajusteGeografico?.taxa || 0;

    const totalAntesFormaPagamento =
      newSubtotal + newAjusteSazonal + newGeoPercentual + geoTaxaFixed;

    const paymentMethodObj = formasPagamento.find((f) => f.id === selectedForma);
    const acrescimoRatio = paymentMethodObj ? (paymentMethodObj.acrescimo || 0) / 100 : 0;
    const newAcrescimoFormaPagamento = totalAntesFormaPagamento * acrescimoRatio;

    const totalAntesCupom = totalAntesFormaPagamento + newAcrescimoFormaPagamento;
    const originalTotalAntesCupom =
      ob.subtotal +
      (ob.ajusteSazonal || 0) +
      (ob.ajusteGeografico?.percentual || 0) +
      (ob.ajusteGeografico?.taxa || 0) +
      (ob.acrescimoFormaPagamento || 0);
    const cupomRatio =
      originalTotalAntesCupom > 0 ? (ob.descontoCupom || 0) / originalTotalAntesCupom : 0;

    const newDescontoCupom = totalAntesCupom * cupomRatio;
    const newTotal = totalAntesCupom - newDescontoCupom;

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

  const handleSave = async () => {
    setSaving(true);
    try {
      const novosDetalhes: LeadOrcamentoDetalhe = {
        ...savedOrcamentoDetalhe,
        selectedProdutos: selectedProducts,
        forma_pagamento_id: selectedForma,
        priceBreakdown: priceBreakdown,
        produtos: allProducts,
        paymentMethod: formasPagamento.find((f) => f.id === selectedForma),
        customFieldsData: customFieldsData,
      };

      const { error } = await supabase
        .from('leads')
        .update({
          // ── Dados básicos do cliente ──
          nome_cliente: nomeCliente || null,
          telefone_cliente: telefoneCliente || null,
          data_evento: dataEvento || null,
          cidade_evento: cidadeEvento || null,
          // ── Valor total atualizado na raiz (corrige resumos e listagens) ──
          valor_total: priceBreakdown.total,
          // ── JSON detalhado do orçamento ──
          orcamento_detalhe: novosDetalhes,
        })
        .eq('id', lead.id);

      if (error) throw error;

      onSave(); // Dispara reload + fecha modal no componente pai
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
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Cidade */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Cidade do Evento
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={cidadeEvento}
                    onChange={(e) => setCidadeEvento(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ex: São Paulo - SP"
                  />
                </div>
              </div>
            </div>

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
                          <label className="flex items-start gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) =>
                                handleToggleProduct(p.id, e.target.checked ? 1 : 0)
                              }
                              className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                            <div>
                              <p className={`font-medium ${isSelected ? 'text-blue-900' : 'text-gray-700'}`}>
                                {p.nome}
                              </p>
                              <p className="text-sm text-gray-500">{formatCurrency(p.valor)}</p>
                            </div>
                          </label>
                        </div>

                        {p.permite_multiplos && isSelected && (
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
                      <span>Desconto Cupom</span>
                      <span>-{formatCurrency(priceBreakdown.descontoCupom)}</span>
                    </div>
                  )}

                  <div className="border-t pt-3 mt-4 flex justify-between items-end">
                    <span className="font-bold text-gray-900 text-base">Total Final</span>
                    <span className="font-black text-blue-600 text-xl">
                      {formatCurrency(priceBreakdown.total)}
                    </span>
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
