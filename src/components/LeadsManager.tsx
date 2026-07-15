import React, { useState, useEffect, useMemo, useCallback } from 'react'; // Re-confirmando importação explícita de React
import { EditLeadQuoteModal } from './EditLeadQuoteModal';
import { supabase, Lead } from '../lib/supabase'; // Importando Lead para tipagem
import { formatCurrency, formatDate, formatDateTime } from '../lib/utils';
import { Trash2, Crown, AlertTriangle, TrendingUp, FileSignature, Star, CheckSquare, Edit3, ClipboardList, Clapperboard, CheckCircle2, MessageCircle, Mail, ExternalLink, LayoutGrid, List, ArrowDownWideNarrow, ArrowUpNarrowWide, Users, Loader2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { usePlanLimits } from '../hooks/usePlanLimits';
import { UpgradeLimitModal } from './UpgradeLimitModal';
import { generateWhatsAppMessage, generateWaLinkToClient, PaymentMethod } from '../lib/whatsappMessageGenerator';
import { ConvertAndContractModal } from './company/ConvertAndContractModal';
import { Product, CustomField, PriceBreakdown } from '../lib/whatsappMessageGenerator'; // Importar interfaces necessárias
import { checkAvailability, AvailabilityResult, deleteEvento } from '../services/availabilityService';
import { useReviewRequest } from '../hooks/useReviewRequest';
import { WorkflowStepper } from './WorkflowStepper';
import { WorkflowStep } from '../types/workflow';
import { checkAndCreateWorkflowNotifications, notifyLeadFinalizado } from '../hooks/useWorkflowSla';
import { NewLeadModal } from './NewLeadModal';

// Define interfaces for better type safety

// New interface to match what's saved in lead.orcamento_detalhe by QuotePage
export interface LeadOrcamentoDetalhe {
  selectedProdutos: Record<string, number>; // { productId: quantity }
  selectedFormaPagamento?: string; // ID da forma de pagamento
  forma_pagamento_id?: string; // ID da forma de pagamento (novo formato)
  produtos: Product[]; // Full list of products from the template
  paymentMethod?: PaymentMethod; // Full payment method object
  customFields: CustomField[]; // Full list of custom fields from the template
  customFieldsData: Record<string, string>; // Data for custom fields
  sistema_sazonal_ativo?: boolean;
  sistema_geografico_ativo?: boolean;
  ocultar_valores_intermediarios?: boolean;
  priceBreakdown: PriceBreakdown;
  upsell_produtos?: any[];
}

interface City {
  id: string;
  nome: string;
}

interface TemplateFromDB {
  id: string;
  texto_whatsapp?: string;
  nome_template: string;
  sistema_sazonal_ativo: boolean;
  sistema_geografico_ativo: boolean;
  ocultar_valores_intermediarios: boolean;
  ocultar_taxa_deslocamento?: boolean;
  limitar_parcelas_pelo_evento?: boolean;
  collab_ativo?: boolean;
  exibir_nome_parceiro?: boolean;
  collab_regra_deslocamento?: 'owner_100' | 'equal_split' | 'proportional' | 'manual_split';
  collab_valores_manuais?: Record<string, number>;
}



interface LeadWithReview extends Lead {
  avaliacao_id?: string | null;
}

export function LeadsManager({ userId }: { userId: string }) {
  const [leads, setLeads] = useState<LeadWithReview[]>([]);
  const [collabProfiles, setCollabProfiles] = useState<Record<string, { id: string; nome_profissional?: string; nome_admin?: string; nome?: string }>>({});

  const isCollabLead = (lead: any) => {
    const prods = lead.orcamento_detalhe?.produtos || [];
    const upsells = lead.orcamento_detalhe?.upsell_produtos || [];
    const hasCollabProds = prods.some((p: any) => p.provedor_id && p.provedor_id !== lead.user_id && p.provedor_id !== userId);
    const hasCollabUpsells = upsells.some((p: any) => p.provedor_id && p.provedor_id !== lead.user_id && p.provedor_id !== userId);
    return hasCollabProds || hasCollabUpsells;
  };
  const [contracts, setContracts] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [followupType, setFollowupType] = useState<'padrao' | 'desconto' | 'brinde' | 'apresentacao' | 'lembrete' | 'urgencia'>('padrao');
  const [followupDiscountPercent, setFollowupDiscountPercent] = useState<number>(10);
  const [followupCouponCode, setFollowupCouponCode] = useState<string>('FECHARHOJE');
  const [followupBonusGift, setFollowupBonusGift] = useState<string>('Um Álbum Pocket de Destaque');
  const [filter, setFilter] = useState<'all' | 'novo' | 'contatado' | 'convertido' | 'perdido' | 'abandonado' | 'em_negociacao' | 'fazer_followup'>('all');
  const [filterTemplate, setFilterTemplate] = useState<string>('all');
  const [selectedLead, setSelectedLead] = useState<LeadWithReview | null>(null);
  const [templates, setTemplates] = useState<Record<string, TemplateFromDB>>({});
  const [cities, setCities] = useState<Record<string, City>>({});
  const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(false);
  const [contractLead, setContractLead] = useState<Lead | null>(null);
  const [detalhesOrcamento, setDetalhesOrcamento] = useState<LeadOrcamentoDetalhe | null>(null);
  const [loadingDetalhes, setLoadingDetalhes] = useState(false);
  const [cancelConversionConfig, setCancelConversionConfig] = useState<{
    leadId: string;
    newStatus: Lead['status'];
    leadName: string;
  } | null>(null);
  const [isCancelingConversion, setIsCancelingConversion] = useState(false);
  const [whatsappMessageBody, setWhatsappMessageBody] = useState<string>('');
  const [disponibilidadeLead, setDisponibilidadeLead] = useState<AvailabilityResult | null>(null);
  const [editingLeadQuote, setEditingLeadQuote] = useState<{lead: Lead | null, detalhes: LeadOrcamentoDetalhe | null}>({lead: null, detalhes: null});
  const [importingLeadData, setImportingLeadData] = useState<any | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [showImportJsonModal, setShowImportJsonModal] = useState(false);
  const [jsonImportText, setJsonImportText] = useState('');
  const [isImportingJson, setIsImportingJson] = useState(false);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingIds, setDeletingIds] = useState(new Set<string>());
  const [deleteConfirmSingle, setDeleteConfirmSingle] = useState<string | null>(null);
  const [deleteConfirmMultiple, setDeleteConfirmMultiple] = useState(false);
  const [duplicatingIds, setDuplicatingIds] = useState(new Set<string>());
  const planLimits = usePlanLimits();
  const { solicitarAvaliacao } = useReviewRequest();

  // Aba principal: 'leads' | 'producao' | 'finalizados'
  const [mainTab, setMainTab] = useState<'leads' | 'producao' | 'finalizados'>('leads');
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('tab') === 'producao') {
      setMainTab('producao');
    } else if (params.get('tab') === 'finalizados') {
      setMainTab('finalizados');
    } else {
      setMainTab('leads');
    }
  }, [location.search]);

  const [leadsViewMode, setLeadsViewMode] = useState<'list' | 'grid'>('list');
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);

  // Estados para configuração do agendamento
  const [bookingMode, setBookingMode] = useState<'avulso' | 'dinamico'>('avulso');
  const [bookingDates, setBookingDates] = useState<string[]>([]);
  const [bookingMonth, setBookingMonth] = useState('');
  const [newDateInput, setNewDateInput] = useState('');
  const [savingBookingConfig, setSavingBookingConfig] = useState(false);
  const [copiedBookingLink, setCopiedBookingLink] = useState(false);
  const [busyDaysPreview, setBusyDaysPreview] = useState<Set<string>>(new Set());
  const [loadingBusy, setLoadingBusy] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'producao') {
      setMainTab('producao');
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (params.get('new') === 'true') {
      setShowNewLeadModal(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Seleciona o lead automaticamente via parâmetro na URL (?leadId=...)
  useEffect(() => {
    if (leads.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const urlLeadId = params.get('leadId');
    if (urlLeadId) {
      const found = leads.find(l => l.id === urlLeadId);
      if (found) {
        setSelectedLead(found);
        
        // Ajusta a aba ativa com base no status do lead
        if (found.status === 'convertido') {
          setMainTab('producao');
        } else if (found.status === 'finalizado') {
          setMainTab('finalizados');
        } else {
          setMainTab('leads');
        }
        
        // Limpa o parâmetro da URL de forma limpa
        const newParams = new URLSearchParams(window.location.search);
        newParams.delete('leadId');
        const queryStr = newParams.toString();
        const newUrl = window.location.pathname + (queryStr ? `?${queryStr}` : '');
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, [leads]);

  // Estado do modal de conversão financeira
  const [convertModal, setConvertModal] = useState<{ lead: Lead; orcamentoDetalhe: any | null; fromContract?: boolean } | null>(null);

  // Estado para Modal de opções extras WhatsApp
  const [whatsappLeadConfig, setWhatsappLeadConfig] = useState<{
    lead: Lead | null;
    savedOrcamentoDetalhe: LeadOrcamentoDetalhe | null;
    isOpen: boolean;
  }>({
    lead: null,
    savedOrcamentoDetalhe: null,
    isOpen: false,
  });

  // Estado para o Modal de Fallback Safari/iOS PWA
  const [safariFallback, setSafariFallback] = useState<{
    isOpen: boolean;
    waLink: string;
    nomeCliente: string;
  }>({
    isOpen: false,
    waLink: '',
    nomeCliente: ''
  });

  // Efeito para carregar detalhes do orçamento quando um lead é selecionado
  useEffect(() => {
    if (selectedLead) {
      loadDetalhesOrcamento(selectedLead, true); // true to update state for the modal
      if (selectedLead.data_evento) {
        checkAvailability(userId, selectedLead.data_evento).then(setDisponibilidadeLead);
      } else {
        setDisponibilidadeLead(null);
      }

      // Inicializa configurações de agendamento do lead
      const cfg = selectedLead.agendamento_config || {};
      setBookingMode(cfg.modo || 'avulso');
      setBookingDates(cfg.datas_sugeridas || []);
      setBookingMonth(cfg.mes_referencia || (() => {
        const today = new Date();
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, '0');
        return `${y}-${m}`;
      })());

      // Carrega datas ocupadas para preview (próximos 3 meses)
      loadBusyDaysPreview(selectedLead.user_id || userId);
    } else {
      setWhatsappMessageBody(''); // Limpa a mensagem anterior
      setDetalhesOrcamento(null);
      setDisponibilidadeLead(null);
      setBookingDates([]);
      setBusyDaysPreview(new Set());
    }
  }, [selectedLead]);

  // Efeito para importação automática de lead via link com parâmetro query '?import=...'
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const importCode = params.get('import');
    if (importCode && userId) {
      // Remove o parâmetro 'import' da URL para evitar re-importação no refresh
      const url = new URL(window.location.href);
      url.searchParams.delete('import');
      window.history.replaceState({}, document.title, url.pathname + url.search);
      
      handleAutoImportFromUrl(importCode);
    }
  }, [userId]);

  const handleAutoImportFromUrl = async (importCode: string) => {
    try {
      let rawText = importCode.trim();
      // Decodificar Base64
      if (!rawText.startsWith('{') && !rawText.startsWith('[')) {
        try {
          rawText = decodeURIComponent(escape(atob(rawText)));
        } catch (e) {
          console.warn('Falha ao decodificar Base64:', e);
        }
      }
      
      const parsedData = JSON.parse(rawText);
      if (!parsedData || !parsedData.nome_cliente) {
        throw new Error('Formato do lead inválido. O campo "nome_cliente" é obrigatório.');
      }
      
      // Associa ao primeiro template do usuário
      const firstTemplateId = Object.keys(templates)[0] || '';

      const newLead = {
        user_id: userId,
        template_id: firstTemplateId || parsedData.template_id,
        nome_cliente: parsedData.nome_cliente,
        email_cliente: parsedData.email_cliente,
        telefone_cliente: parsedData.telefone_cliente,
        valor_total: parsedData.valor_total,
        dados_formulario: parsedData.dados_formulario,
        orcamento_detalhe: parsedData.orcamento_detalhe,
        status: 'novo',
        data_evento: parsedData.data_evento,
        cidade_evento: parsedData.cidade_evento,
        tipo_evento: parsedData.tipo_evento,
      };

      const { error } = await supabase
        .from('leads')
        .insert([newLead]);

      if (error) throw error;

      alert(`🤝 Lead de parceria para "${parsedData.nome_cliente}" importado com sucesso!`);
      loadLeads();
    } catch (err: any) {
      console.error('Erro ao importar lead via URL:', err);
      const errMsg = err?.message || err?.details || JSON.stringify(err) || 'Verifique se o link foi gerado corretamente.';
      alert(`❌ Não foi possível importar o lead de collab automaticamente.\n\n${errMsg}`);
    }
  };

  const loadBusyDaysPreview = async (ownerUserId: string) => {
    setLoadingBusy(true);
    try {
      const today = new Date();
      const startDate = today.toISOString().split('T')[0];
      const endDate = new Date(today.getFullYear(), today.getMonth() + 4, 0);
      const endStr = endDate.toISOString().split('T')[0];
      const { data } = await supabase
        .from('eventos_agenda')
        .select('data_evento')
        .eq('user_id', ownerUserId)
        .gte('data_evento', startDate)
        .lte('data_evento', endStr)
        .not('status', 'eq', 'cancelado');
      const busy = new Set((data || []).map((e: any) => e.data_evento.split('T')[0]));
      setBusyDaysPreview(busy);
    } catch (err) {
      console.error('Erro ao carregar datas ocupadas:', err);
    } finally {
      setLoadingBusy(false);
    }
  };

  const handleSaveBookingConfig = async () => {
    if (!selectedLead) return;
    setSavingBookingConfig(true);
    try {
      const configData = {
        modo: bookingMode,
        datas_sugeridas: bookingMode === 'avulso' ? bookingDates : [],
        mes_referencia: bookingMode === 'dinamico' ? bookingMonth : null
      };

      const { error } = await supabase
        .from('leads')
        .update({ agendamento_config: configData })
        .eq('id', selectedLead.id);

      if (error) throw error;

      // Atualiza o lead selecionado e a lista
      setSelectedLead(prev => prev ? { ...prev, agendamento_config: configData } : null);
      setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, agendamento_config: configData } : l));
      alert('✅ Configuração de agendamento salva com sucesso!');
    } finally {
      setSavingBookingConfig(false);
    }
  };

  const handleDuplicateLead = async (lead: LeadWithReview) => {
    if (duplicatingIds.has(lead.id)) return;
    setDuplicatingIds(prev => new Set(prev).add(lead.id));
    try {
      const { error } = await supabase.from('leads').insert([{
        user_id: userId,
        template_id: lead.template_id,
        nome_cliente: lead.nome_cliente ? `${lead.nome_cliente} (cópia)` : '(cópia)',
        email_cliente: lead.email_cliente,
        telefone_cliente: lead.telefone_cliente,
        valor_total: lead.valor_total,
        dados_formulario: lead.dados_formulario,
        orcamento_detalhe: lead.orcamento_detalhe,
        status: 'novo',
        data_evento: lead.data_evento,
        cidade_evento: lead.cidade_evento,
        tipo_evento: lead.tipo_evento,
        origem: 'duplicado',
      }]);
      if (error) throw error;
      await loadLeads();
    } catch (err: any) {
      console.error('Erro ao duplicar lead:', err);
      alert(`❌ Não foi possível duplicar o lead: ${err?.message || 'Erro desconhecido'}`);
    } finally {
      setDuplicatingIds(prev => { const s = new Set(prev); s.delete(lead.id); return s; });
    }
  };

  const getLeadExportCode = (lead: LeadWithReview) => {
    const exportCity = lead.cidade_evento ? (cities[lead.cidade_evento]?.nome || lead.cidade_evento) : '';
    const exportData = {
      nome_cliente: lead.nome_cliente,
      email_cliente: lead.email_cliente,
      telefone_cliente: lead.telefone_cliente,
      valor_total: lead.valor_total,
      dados_formulario: lead.dados_formulario,
      orcamento_detalhe: lead.orcamento_detalhe,
      data_evento: lead.data_evento,
      cidade_evento: exportCity,
      tipo_evento: lead.tipo_evento,
    };
    return JSON.stringify(exportData);
  };



  const loadDetalhesOrcamento = async (lead: Lead, updateState: boolean): Promise<LeadOrcamentoDetalhe | null> => {
    if (!lead.orcamento_detalhe) return null;
    if (updateState) {
      setLoadingDetalhes(true);
      setWhatsappMessageBody('');
    }

    // Directly use the saved orcamento_detalhe as it contains all necessary info
    const savedOrcamentoDetalhe: LeadOrcamentoDetalhe = lead.orcamento_detalhe as LeadOrcamentoDetalhe;

    let produtosCompletos: Product[] = [];
    const selectedProdutosDict: Record<string, number> = {};
    const produtosRaw = savedOrcamentoDetalhe.produtos || [];

    if (produtosRaw.length > 0 && typeof produtosRaw[0] === 'object' && ('produto_id' in produtosRaw[0])) {
      const ids = produtosRaw.map((p: any) => p.produto_id || p.id);
      const { data: fetchProdutos } = await supabase.from('produtos').select('*').in('id', ids);
      if (fetchProdutos && fetchProdutos.length > 0) {
        produtosCompletos = fetchProdutos;
        produtosRaw.forEach((p: any) => {
          selectedProdutosDict[p.produto_id || p.id] = p.quantidade;
        });
      } else {
        // Se os produtos não forem achados localmente (ex: lead importador), usa os dados que vieram no orcamento_detalhe
        produtosCompletos = produtosRaw;
        produtosRaw.forEach((p: any) => {
          selectedProdutosDict[p.produto_id || p.id] = p.quantidade || 1;
        });
      }
    } else if (savedOrcamentoDetalhe.selectedProdutos) {
      Object.assign(selectedProdutosDict, savedOrcamentoDetalhe.selectedProdutos);
      const ids = Object.keys(selectedProdutosDict);
      const { data: fetchProdutos } = await supabase.from('produtos').select('*').in('id', ids);
      if (fetchProdutos && fetchProdutos.length > 0) {
        produtosCompletos = fetchProdutos;
      } else {
        produtosCompletos = savedOrcamentoDetalhe.produtos || [];
      }
    } else {
      produtosCompletos = savedOrcamentoDetalhe.produtos || [];
    }

    let formaPagamentoCompleta = savedOrcamentoDetalhe.paymentMethod;
    const pagamentoIdRaw = savedOrcamentoDetalhe.selectedFormaPagamento || savedOrcamentoDetalhe.forma_pagamento_id || (savedOrcamentoDetalhe as any).selecoes?.paymentMethod;
    const pagamentoId = typeof pagamentoIdRaw === 'object' && pagamentoIdRaw !== null ? pagamentoIdRaw.id : pagamentoIdRaw;
    if (pagamentoId && !formaPagamentoCompleta) {
      const { data: fetchPagamento } = await supabase.from('formas_pagamento').select('*').eq('id', pagamentoId).maybeSingle();
      if (fetchPagamento) {
        formaPagamentoCompleta = fetchPagamento;
      }
    }

    const orcamentoEnriquecido: LeadOrcamentoDetalhe = {
      ...savedOrcamentoDetalhe,
      produtos: produtosCompletos,
      selectedProdutos: selectedProdutosDict,
      paymentMethod: formaPagamentoCompleta,
      upsell_produtos: savedOrcamentoDetalhe.upsell_produtos || []
    };

    // Buscar perfis de collab para exibição e exportação no modal
    const providerIds = new Set<string>();
    produtosCompletos.forEach((p: any) => { if (p.provedor_id && p.provedor_id !== lead.user_id && p.provedor_id !== userId) providerIds.add(p.provedor_id); });
    (savedOrcamentoDetalhe.upsell_produtos || []).forEach((p: any) => { if (p.provedor_id && p.provedor_id !== lead.user_id && p.provedor_id !== userId) providerIds.add(p.provedor_id); });
    const uniqueIds = Array.from(providerIds);

    if (uniqueIds.length > 0) {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, nome_profissional, nome_admin, nome')
          .in('id', uniqueIds);

        const profileMap: Record<string, any> = {};
        data?.forEach(p => {
          profileMap[p.id] = p;
        });
        setCollabProfiles(prev => ({ ...prev, ...profileMap }));
      } catch (err) {
        console.error('Erro ao carregar perfis de collab no LeadsManager:', err);
      }
    }

    if (updateState) {
      setDetalhesOrcamento(orcamentoEnriquecido);
      setLoadingDetalhes(false);
      // Agora, geramos a prévia da mensagem do WhatsApp
      generateAndSetWhatsappMessage(lead, orcamentoEnriquecido, true);
    }

    return orcamentoEnriquecido;
  };

  // Função para gerar e armazenar o corpo da mensagem do WhatsApp
  const generateAndSetWhatsappMessage = async (
    lead: Lead,
    savedOrcamentoDetalhe: LeadOrcamentoDetalhe,
    updateState: boolean,
    customFollowup?: { type: 'padrao' | 'desconto' | 'brinde' | 'apresentacao' | 'lembrete' | 'urgencia', discountPercent?: number, couponCode?: string, bonusGift?: string }
  ): Promise<string> => {
    const template: TemplateFromDB = templates[lead.template_id];
    const { data: profile } = await supabase
      .from('profiles')
      .select('nome_profissional, email_recebimento, whatsapp_principal')
      .eq('id', userId)
      .single();

    const cityName = cities[lead.cidade_evento || '']?.nome || lead.cidade_evento || undefined;

    let initialBreakdown = savedOrcamentoDetalhe.priceBreakdown || {
      subtotal: lead.valor_total,
      ajusteSazonal: 0,
      ajusteGeografico: { percentual: 0, taxa: 0 },
      descontoCupom: 0,
      acrescimoFormaPagamento: 0,
      total: lead.valor_total,
    };

    let couponCode = undefined;
    let couponDiscount = undefined;

    if (customFollowup?.type === 'desconto') {
      couponCode = customFollowup.couponCode;
      couponDiscount = customFollowup.discountPercent;
      const discountVal = (initialBreakdown.subtotal * (customFollowup.discountPercent || 0)) / 100;
      initialBreakdown = {
        ...initialBreakdown,
        descontoCupom: discountVal,
        total: Math.max(0, initialBreakdown.subtotal - discountVal),
      };
    }

    let mensagem = generateWhatsAppMessage({
      clientName: lead.nome_cliente || '', // Corrected: Ensure clientName is always a string
      clientEmail: lead.email_cliente || '',
      clientPhone: lead.telefone_cliente || '',
      profile: {
        nome_profissional: profile?.nome_profissional,
        email_recebimento: profile?.email_recebimento,
        whatsapp_principal: profile?.whatsapp_principal,
      },
      template: {
        nome: template?.nome_template || '',
        texto_whatsapp: customFollowup && customFollowup.type !== 'padrao'
          ? `📦 *SERVIÇOS SOLICITADOS:*
{{SERVICES_LIST}}

💰 *VALOR TOTAL:* {{TOTAL_VALUE}}
💳 *Forma de Pagamento:* {{PAYMENT_METHOD}}
{{DOWN_PAYMENT}}
{{INSTALLMENTS}}`
          : template?.texto_whatsapp,
        // ✅ Usa configurações ATUAIS do template (banco), não as salvas no orcamento_detalhe
        // Os valores do orcamento_detalhe são fallback para leads antigos
        sistema_sazonal_ativo: template?.sistema_sazonal_ativo ?? savedOrcamentoDetalhe.sistema_sazonal_ativo ?? false,
        sistema_geografico_ativo: template?.sistema_geografico_ativo ?? savedOrcamentoDetalhe.sistema_geografico_ativo ?? false,
        ocultar_valores_intermediarios: savedOrcamentoDetalhe.ocultar_valores_intermediarios || false,
        ocultar_taxa_deslocamento: template?.ocultar_taxa_deslocamento || false,
      },
      products: savedOrcamentoDetalhe.produtos || [], // Full list of products from template
      selectedProducts: savedOrcamentoDetalhe.selectedProdutos || {}, // Map of selected products
      paymentMethod: savedOrcamentoDetalhe.paymentMethod ? {
        ...savedOrcamentoDetalhe.paymentMethod,
        max_parcelas: (() => {
          let max = savedOrcamentoDetalhe.paymentMethod.max_parcelas;
          if (template?.limitar_parcelas_pelo_evento && lead.data_evento) {
            const normalizedNome = (savedOrcamentoDetalhe.paymentMethod.nome || '')
              .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const isCartao = normalizedNome.includes('cartao') || normalizedNome.includes('credit');
            if (!isCartao) {
              const hoje = new Date();
              const [year, month, day] = lead.data_evento.split('-');
              const dataEv = new Date(Number(year), Number(month) - 1, Number(day));
              const diffAnos = dataEv.getFullYear() - hoje.getFullYear();
              const diffMeses = dataEv.getMonth() - hoje.getMonth();
              const mesesRestantes = diffAnos * 12 + diffMeses;
              max = Math.min(max, Math.max(1, mesesRestantes));
            }
          }
          return max;
        })()
      } : undefined,
      lastInstallmentDate: (() => {
        const pMethod = savedOrcamentoDetalhe.paymentMethod;
        if (!pMethod) return undefined;
        let maxP = pMethod.max_parcelas;
        if (template?.limitar_parcelas_pelo_evento && lead.data_evento) {
          const normalizedNome = (pMethod.nome || '')
            .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const isCartao = normalizedNome.includes('cartao') || normalizedNome.includes('credit');
          if (!isCartao) {
            const hoje = new Date();
            const [year, month, day] = lead.data_evento.split('-');
            const dataEv = new Date(Number(year), Number(month) - 1, Number(day));
            const diffAnos = dataEv.getFullYear() - hoje.getFullYear();
            const diffMeses = dataEv.getMonth() - hoje.getMonth();
            const mesesRestantes = diffAnos * 12 + diffMeses;
            maxP = Math.min(maxP, Math.max(1, mesesRestantes));
          }
        }
        if (maxP <= 1) return undefined;
        const date = new Date();
        date.setMonth(date.getMonth() + maxP);
        return date.toISOString().split('T')[0];
      })(),
      priceBreakdown: initialBreakdown,
      couponCode,
      couponDiscount,
      eventDate: lead.data_evento || undefined,
      eventCity: cityName || undefined, 
      availabilityStatus: disponibilidadeLead?.status, // Passa o status da disponibilidade

      customFields: savedOrcamentoDetalhe.customFields || [],
      customFieldsData: savedOrcamentoDetalhe.customFieldsData || {},
      upsellProducts: savedOrcamentoDetalhe.upsell_produtos || [],
      context: 'photographer-to-client',
    });

    if (customFollowup?.type === 'desconto') {
      mensagem = `🎉 *CONDIÇÃO ESPECIAL!* 🎉\n\nOlá, ${lead.nome_cliente || 'cliente'}! Estou passando para liberar um desconto exclusivo de *${customFollowup.discountPercent}%* na sua proposta se fecharmos nas próximas 24h! Use o cupom *${customFollowup.couponCode}*.\n\nSeguem os detalhes atualizados:\n\n${mensagem}\n\nFico à total disposição para tirar qualquer dúvida! 😊`;
    } else if (customFollowup?.type === 'brinde') {
      mensagem = `🎁 *PRESENTE EXCLUSIVO!* 🎁\n\nOlá, ${lead.nome_cliente || 'cliente'}! Se você confirmar seu fechamento nas próximas 24h, vou incluir totalmente grátis de bônus no seu pacote: *${customFollowup.bonusGift}*!\n\nRelembrando os detalhes do orçamento:\n\n${mensagem}\n\nEspero que possamos fechar! 😊`;
    } else if (customFollowup?.type === 'apresentacao') {
      mensagem = `📸 *PROPOSTA PERSONALIZADA!* 📸\n\nOlá, ${lead.nome_cliente || 'cliente'}! Tudo bem?\n\nPreparei com muito carinho a proposta comercial para o seu evento. Seguem abaixo os detalhes dos pacotes e formas de pagamento:\n\n${mensagem}\n\nFico à total disposição para tirar qualquer dúvida e fazermos esse registro incrível! ✨`;
    } else if (customFollowup?.type === 'lembrete') {
      mensagem = `👋 *LEMBRETE DE PROPOSTA!* 👋\n\nOlá, ${lead.nome_cliente || 'cliente'}! Tudo bem?\n\nPassando para saber se você conseguiu dar uma olhada na proposta que preparei para o seu evento. Seguem os valores e detalhes para você rever:\n\n${mensagem}\n\nQualquer dúvida ou ajuste que queira fazer no pacote, por favor me avise! 😊`;
    } else if (customFollowup?.type === 'urgencia') {
      let dataTexto = 'o mês do seu evento';
      if (lead.data_evento) {
        try {
          const [year, month, day] = lead.data_evento.split('-');
          const date = new Date(Number(year), Number(month) - 1, Number(day));
          dataTexto = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        } catch (e) {
          // fallback
        }
      }
      mensagem = `⚠️ *POUCAS DATAS DISPONÍVEIS!* ⚠️\n\nOlá, ${lead.nome_cliente || 'cliente'}! Tudo bem?\n\nEscrevo para te avisar que nossa agenda para *${dataTexto}* está bastante concorrida e restam poucas datas livres.\n\nComo você já tem o orçamento em mãos, gostaria de saber se vamos garantir o seu dia? Seguem os detalhes da proposta:\n\n${mensagem}\n\nAbraços, espero que possamos fechar! 👋`;
    }

    if (updateState) {
      setWhatsappMessageBody(mensagem);
    }

    return mensagem;
  };

  // Efeito para atualizar dinamicamente a prévia da mensagem do WhatsApp ao alterar opções de follow-up
  useEffect(() => {
    if (whatsappLeadConfig.isOpen && whatsappLeadConfig.lead && whatsappLeadConfig.savedOrcamentoDetalhe) {
      generateAndSetWhatsappMessage(
        whatsappLeadConfig.lead, 
        whatsappLeadConfig.savedOrcamentoDetalhe, 
        true, 
        {
          type: followupType,
          discountPercent: followupDiscountPercent,
          couponCode: followupCouponCode,
          bonusGift: followupBonusGift
        }
      );
    }
  }, [
    whatsappLeadConfig.isOpen, 
    whatsappLeadConfig.lead, 
    whatsappLeadConfig.savedOrcamentoDetalhe, 
    followupType, 
    followupDiscountPercent, 
    followupCouponCode, 
    followupBonusGift
  ]);

  useEffect(() => {
    loadLeads();
    loadTemplates();
    loadCities();
    loadContractsForLeads();
  }, []);

  // Efeito para interceptar link de compartilhamento e carregar modal de importação
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const encodedLead = params.get('import_lead');
    if (encodedLead) {
      try {
        const decodedString = decodeURIComponent(escape(atob(encodedLead)));
        const leadData = JSON.parse(decodedString);
        if (leadData && leadData.nome_cliente) {
          setImportingLeadData(leadData);
        }
      } catch (e) {
        console.error('Erro ao decodificar lead para importação:', e);
      }
      
      // Limpar parâmetro da URL de forma limpa sem regerar a renderização
      const newParams = new URLSearchParams(window.location.search);
      newParams.delete('import_lead');
      const queryStr = newParams.toString();
      const newUrl = window.location.pathname + (queryStr ? `?${queryStr}` : '');
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  const handleExecuteImportLead = async () => {
    if (!importingLeadData) return;
    setIsImporting(true);
    try {
      const newLead = {
        user_id: userId,
        nome_cliente: importingLeadData.nome_cliente,
        email_cliente: importingLeadData.email_cliente,
        telefone_cliente: importingLeadData.telefone_cliente,
        valor_total: importingLeadData.valor_total,
        dados_formulario: importingLeadData.dados_formulario,
        orcamento_detalhe: importingLeadData.orcamento_detalhe,
        status: 'novo',
        data_evento: importingLeadData.data_evento,
        cidade_evento: importingLeadData.cidade_evento,
        tipo_evento: importingLeadData.tipo_evento,
      };

      const { error } = await supabase
        .from('leads')
        .insert([newLead]);

      if (error) throw error;

      alert(`✅ Lead de ${importingLeadData.nome_cliente} importado com sucesso para sua lista!`);
      setImportingLeadData(null);
      loadLeads();
    } catch (err: any) {
      console.error('Erro ao importar lead:', err);
      alert('❌ Ocorreu um erro ao importar o lead.');
    } finally {
      setIsImporting(false);
    }
  };

  useEffect(() => {
    const channel = supabase
      .channel('realtime-leads')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Alteração de lead recebida via Realtime:', payload);
          if (payload.eventType === 'INSERT') {
            const newLead = payload.new as LeadWithReview;
            setLeads((prevLeads) => {
              if (prevLeads.some(l => l.id === newLead.id)) return prevLeads;
              return [newLead, ...prevLeads];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedLead = payload.new as LeadWithReview;
            setLeads((prevLeads) =>
              prevLeads.map((l) => (l.id === updatedLead.id ? { ...l, ...updatedLead } : l))
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as any).id;
            setLeads((prevLeads) => prevLeads.filter((l) => l.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const loadCities = async () => {
    try {
      const { data, error } = await supabase
        .from('cidades_ajuste')
        .select('id, nome')
        .eq('user_id', userId);
      if (error) throw error;

      // Explicitly type the city object
      const citiesMap: Record<string, City> = {};
      data?.forEach((city: City) => {
        citiesMap[city.id] = city; // Assign the whole city object
      }); 
      setCities(citiesMap);
    } catch (error) {
      console.error('Erro ao carregar cidades:', error);
    }
  };

  const loadTemplates = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('templates')
        .select('id, texto_whatsapp, nome_template, sistema_sazonal_ativo, sistema_geografico_ativo, ocultar_valores_intermediarios, limitar_parcelas_pelo_evento')
        .eq('user_id', userId);

      if (error) throw error;
      
      const templatesMap: Record<string, TemplateFromDB> = {};
      data?.forEach((template: TemplateFromDB) => {
        templatesMap[template.id] = template;
      });
      setTemplates(templatesMap);
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
    }
  }, [userId]);

  const loadContractsForLeads = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('lead_id')
        .eq('user_id', userId)
        .not('lead_id', 'is', null);

      if (error) throw error;

      const contractMap = data.reduce((acc: Record<string, boolean>, contract: { lead_id: string | null }) => {
        if (contract.lead_id) acc[contract.lead_id] = true;
        return acc;
      }, {} as Record<string, boolean>);
      setContracts(contractMap);
    } catch (error) { console.error('Erro ao carregar contratos dos leads:', error); }
  }, [userId]);

  const loadLeads = useCallback(async (silent: boolean = false) => {
    if (!silent) setLoading(true);
    try {
      let query = supabase
        .from('leads')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      const netError = error as Error;
      if (!silent) {
        console.error('Erro ao carregar leads:', netError);
        alert(`Falha ao carregar os leads. Verifique sua conexão com a internet. Detalhe: ${netError.message}`);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [userId, filter]);

  const executeCancelConversion = async (leadId: string, newStatus: Lead['status']) => {
    setIsCancelingConversion(true);
    try {
      const { error: txError } = await supabase
        .from('company_transactions')
        .delete()
        .eq('lead_id', leadId);
      if (txError) throw txError;

      const { data: agendaEvents } = await supabase
        .from('eventos_agenda')
        .select('id')
        .eq('lead_id', leadId);

      if (agendaEvents && agendaEvents.length > 0) {
        for (const evt of agendaEvents) {
          await deleteEvento(evt.id);
        }
      }

      const { error: contractError } = await supabase
        .from('contracts')
        .delete()
        .eq('lead_id', leadId);
      if (contractError) throw contractError;

      const { data: leadData } = await supabase
        .from('leads')
        .select('orcamento_detalhe')
        .eq('id', leadId)
        .single();
        
      if (leadData?.orcamento_detalhe) {
        const updatedDetail = { ...leadData.orcamento_detalhe };
        delete updatedDetail.plano_pagamento;
        await supabase
          .from('leads')
          .update({ orcamento_detalhe: updatedDetail })
          .eq('id', leadId);
      }

      const { error: statusError } = await supabase
        .from('leads')
        .update({
          status: newStatus,
          data_ultimo_contato: newStatus === 'contatado' ? new Date().toISOString() : null,
        })
        .eq('id', leadId);

      if (statusError) throw statusError;

      alert('✅ Conversão desfeita com sucesso! Lançamentos financeiros, datas na agenda e contratos foram removidos.');
      setCancelConversionConfig(null);
      loadLeads();
      if (selectedLead && selectedLead.id === leadId) {
        setSelectedLead(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err: any) {
      console.error('Erro ao cancelar conversão do lead:', err);
      alert(`❌ Erro ao desfazer conversão: ${err.message}`);
    } finally {
      setIsCancelingConversion(false);
    }
  };

  const updateLeadStatus = async (leadId: string, newStatus: Lead['status']) => {
    const lead = leads.find((l: LeadWithReview) => l.id === leadId);
    const currentStatus = lead?.status;

    if (
      lead &&
      (currentStatus === 'convertido' || currentStatus === 'finalizado') &&
      (newStatus !== 'convertido' && newStatus !== 'finalizado')
    ) {
      setCancelConversionConfig({
        leadId,
        newStatus,
        leadName: lead.nome_cliente || 'Cliente',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('leads')
        .update({
          status: newStatus,
          data_ultimo_contato: newStatus === 'contatado' ? new Date().toISOString() : null,
        })
        .eq('id', leadId);

      if (error) throw error;
      
      if (newStatus === 'convertido') {
        const lead = leads.find((l: LeadWithReview) => l.id === leadId);
        
        if (lead) {
          setSelectedLead(null);
          loadDetalhesOrcamento(lead, false).then(detalhe => {
            setConvertModal({ lead, orcamentoDetalhe: detalhe, fromContract: false });
          });
        }
        
        try {
          await supabase.from('notifications').insert({
            user_id: userId,
            type: 'lead_converted',
            title: 'Lead convertido! 🎉',
            message: `Parabéns! O lead ${lead?.nome_cliente || ''} foi convertido. Inicie o workflow de produção.`,
            link: `/dashboard/leads`,
            related_id: leadId,
          });
        } catch (notifErr) {
          console.error('Falha ao criar notificação:', notifErr);
        }

      } else if (newStatus === 'finalizado') {
        setMainTab('finalizados');
      } else if (newStatus !== 'contatado') {
        alert('✅ Status atualizado com sucesso!');
      }

      loadLeads();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      alert('❌ Erro ao atualizar status');
    }
  };

  /** Chamado pelo WorkflowStepper quando o workflow de um lead muda */
  const handleWorkflowChange = useCallback((leadId: string, updatedWorkflow: WorkflowStep[]) => {
    setLeads(prev => prev.map(l =>
      l.id === leadId ? { ...l, workflow: updatedWorkflow } : l
    ));
  }, []);

  /** Chamado pelo WorkflowStepper quando TODAS as etapas são concluídas */
  const handleLeadFinalizado = useCallback(async (lead: LeadWithReview) => {
    try {
      await supabase.from('leads').update({ status: 'finalizado' }).eq('id', lead.id);
      await notifyLeadFinalizado(lead, userId);
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: 'finalizado' } : l));
      setMainTab('finalizados');
    } catch (err) {
      console.error('Erro ao finalizar lead:', err);
    }
  }, [userId]);

  /** Verifica notificações de SLA ao entrar na aba Produção */
  const checkProducaoNotifications = useCallback(async () => {
    const leadsProducao = leads.filter(l => l.status === 'convertido');
    if (leadsProducao.length > 0) {
      await checkAndCreateWorkflowNotifications(leadsProducao, userId);
    }
  }, [leads, userId]);


  const handleDeleteSelected = useCallback(async () => {
    setIsDeleting(true);
    try {
      console.log('[handleDeleteSelected] Tentando excluir leads:', selectedIds);
      const { error, count } = await supabase.from('leads').delete().in('id', selectedIds).select();
      if (error) {
        console.error('[handleDeleteSelected] Erro Supabase:', { code: error.code, message: error.message, details: error.details, hint: error.hint });
        throw error;
      }
      console.log('[handleDeleteSelected] Leads excluídos com sucesso. count:', count);
      setSelectedIds([]);
      await loadLeads();
    } catch (error) {
      console.error('[handleDeleteSelected] Erro:', error);
      alert('❌ Erro ao excluir leads.');
    } finally {
      setIsDeleting(false);
      setDeleteConfirmMultiple(false);
    }
  }, [selectedIds, loadLeads]);

  // Leads filtrados somente por template (base para os stats)
  const templateFilteredLeads = useMemo(() => {
    if (filterTemplate === 'all') return leads;
    return leads.filter(lead => lead.template_id === filterTemplate);
  }, [leads, filterTemplate]);

  // Lista de templates que possuem leads, com contadores
  const templateTabs = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach(lead => {
      if (lead.template_id) {
        counts[lead.template_id] = (counts[lead.template_id] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .filter(([id]) => templates[id])
      .map(([id, count]) => ({ id, nome: templates[id].nome_template, count }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [leads, templates]);

  const filteredLeads = useMemo(() => {
    let result = filterTemplate === 'all' ? leads : leads.filter(lead => lead.template_id === filterTemplate);
    if (filter !== 'all') result = result.filter(lead => lead.status === filter);
    return result;
  }, [leads, filter, filterTemplate]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredLeads.map(l => l.id));
    } else {
      setSelectedIds([]);
    }
  };

  const sendWhatsAppMessage = async (lead: Lead) => {
    if (!lead.telefone_cliente) {
      alert('❌ Este lead não possui telefone cadastrado');
      return;
    }

    try {
      // 1. Carregar os detalhes do orçamento para este lead específico
      const savedOrcamentoDetalhe = await loadDetalhesOrcamento(lead, false);
      if (!savedOrcamentoDetalhe) {
        alert('❌ Não foi possível carregar os detalhes do orçamento para este lead.');
        return;
      }

      // Sempre mostra as opções de apresentação dos valores para o usuário decidir
      setWhatsappLeadConfig({ lead, savedOrcamentoDetalhe, isOpen: true });
      return; // Espera a decisão do usuário
    } catch (error) {
      console.error("Erro ao gerar mensagem do WhatsApp:", error);
      alert("❌ Ocorreu um erro ao gerar a mensagem. Verifique os dados do lead e tente novamente.");
    }
  };

  const executeWhatsAppMessage = async (
    lead: Lead,
    savedOrcamentoDetalhe: LeadOrcamentoDetalhe,
    ocultarExtras: boolean,
    customFollowup?: { type: 'padrao' | 'desconto' | 'brinde' | 'apresentacao' | 'lembrete' | 'urgencia', discountPercent?: number, couponCode?: string, bonusGift?: string }
  ) => {
    try {
      if (ocultarExtras) {
        savedOrcamentoDetalhe.ocultar_valores_intermediarios = true;
      }

      await checkAvailability(userId, lead.data_evento || ''); // Só chamando p consistência (status é passado como prop?)
      const mensagem = await generateAndSetWhatsappMessage(lead, savedOrcamentoDetalhe, false, customFollowup);

      // 🔥 GERAR LINK WA.ME
      const waLink = generateWaLinkToClient(lead.telefone_cliente, mensagem);
      
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

      updateLeadStatus(lead.id, 'contatado');

      if (isMobile || isSafari) {
         // Safari / iOS PWA bloqueiam eventos programaticos agressivamente.
         // Mostra o Modal de aviso com um botão link direto que será sincrono
         setSafariFallback({
            isOpen: true,
            waLink: waLink,
            nomeCliente: lead.nome_cliente || 'Cliente'
         });
      } else {
        window.open(waLink, '_blank'); 
      }
    } catch (error) {
      console.error("Erro na execução da mensagem:", error);
      alert("❌ Ocorreu um erro ao enviar a mensagem final.");
    } finally {
      // Fecha o modal garantidamente
      setWhatsappLeadConfig({ lead: null, savedOrcamentoDetalhe: null, isOpen: false });
    }
  };

  const handleSolicitarAvaliacao = useCallback(async (lead: LeadWithReview) => {
    if (lead.status !== 'convertido' && lead.status !== 'finalizado') {
      alert('⚠️ Apenas leads convertidos ou finalizados podem receber solicitação de avaliação.');
      return;
    }

    if (!lead.telefone_cliente) {
      alert('⚠️ Este lead não possui telefone cadastrado.');
      return;
    }

    const result = await solicitarAvaliacao(lead.id);

    if (result.success && result.token) {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        setTimeout(() => { window.location.href = result.token as string; }, 500);
      } else {
        window.open(result.token, '_blank');
      }
      alert('✅ Link de avaliação gerado! A mensagem será aberta no WhatsApp.');
      loadLeads();
    } else {
      alert(`❌ ${result.error || 'Erro ao solicitar avaliação'}`);
    }
  }, [loadLeads]);

  const deleteLead = async (leadId: string) => {
    setDeletingIds(prev => { const s = new Set(prev); s.add(leadId); return s; });
    try {
      console.log('[deleteLead] Tentando excluir lead:', leadId);
      const { error, count } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId)
        .select();

      if (error) {
        console.error('[deleteLead] Erro Supabase:', { code: error.code, message: error.message, details: error.details, hint: error.hint });
        throw error;
      }
      console.log('[deleteLead] Lead excluído com sucesso. count:', count);
      await loadLeads();
    } catch (error) {
      console.error('[deleteLead] Erro ao excluir lead:', error);
      alert('❌ Erro ao excluir lead. Veja o console para detalhes.');
    } finally {
      setDeletingIds(prev => { const s = new Set(prev); s.delete(leadId); return s; });
      setDeleteConfirmSingle(null);
    }
  };

  const getStatusBadge = (status: Lead['status']) => {
    const badges: Record<Lead['status'], string> = {
      novo: 'bg-blue-100 text-blue-800',
      contatado: 'bg-yellow-100 text-yellow-800',
      convertido: 'bg-green-100 text-green-800',
      perdido: 'bg-red-100 text-red-800', // Corrigido: 'perdido' estava faltando
      abandonado: 'bg-gray-100 text-gray-800',
      em_negociacao: 'bg-purple-100 text-purple-800',
      fazer_followup: 'bg-orange-100 text-orange-800',
  finalizado: 'Finalizado',
    };
    const labels: Record<string, string> = {
      novo: '🆕 Novo',
      contatado: '💬 Contatado',
      convertido: '✅ Convertido',
      perdido: '❌ Perdido',
      abandonado: '⏸️ Abandonado',
      em_negociacao: '🤝 Em Negociação',
      fazer_followup: '📞 Fazer Follow-up',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const stats = React.useMemo(() => ({
    total: templateFilteredLeads.length,
    novos: templateFilteredLeads.filter((l: LeadWithReview) => l.status === 'novo').length,
    abandonados: templateFilteredLeads.filter((l: LeadWithReview) => l.status === 'abandonado').length,
    convertidos: templateFilteredLeads.filter((l: LeadWithReview) => l.status === 'convertido').length,
    taxaConversao: templateFilteredLeads.length > 0
      ? ((templateFilteredLeads.filter((l: LeadWithReview) => l.status === 'convertido').length / templateFilteredLeads.length) * 100).toFixed(1)
      : '0.0',
  }), [templateFilteredLeads]);

  const getLeadsLimitPercentage = () => {
    if (planLimits.leadsLimit === 'unlimited') return 0;
    return (planLimits.leadsUsed / planLimits.leadsLimit) * 100;
  };

  const getLeadsLimitColor = () => {
    const percentage = getLeadsLimitPercentage();
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-green-600';
  };

    if (loading || planLimits.loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ══════════════════════════════════════════════════════════
          NAVEGAÇÃO PRINCIPAL: 3 ABAS
      ══════════════════════════════════════════════════════════ */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-[rgba(255,255,255,0.04)] rounded-xl border border-gray-200 dark:border-[rgba(255,255,255,0.08)]">
        {/* Aba Leads (original) */}
        <button
          id="tab-leads"
          onClick={() => setMainTab('leads')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            mainTab === 'leads'
              ? 'bg-white dark:bg-[#0a1628] text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>Timeline</span>
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
            mainTab === 'leads' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' : 'bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-gray-400'
          }`}>
            {leads.filter(l => !['convertido','finalizado'].includes(l.status)).length}
          </span>
        </button>

        {/* Aba Clientes / Produção */}
        <button
          id="tab-producao"
          onClick={() => { setMainTab('producao'); checkProducaoNotifications(); }}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            mainTab === 'producao'
              ? 'bg-white dark:bg-[#0a1628] text-purple-600 dark:text-purple-400 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          <Clapperboard className="w-4 h-4" />
          <span className="hidden sm:inline">Clientes/Produção</span>
          <span className="sm:hidden">Produção</span>
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
            mainTab === 'producao' ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400' : 'bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-gray-400'
          }`}>
            {leads.filter(l => l.status === 'convertido').length}
          </span>
        </button>

        {/* Aba Finalizados */}
        <button
          id="tab-finalizados"
          onClick={() => setMainTab('finalizados')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            mainTab === 'finalizados'
              ? 'bg-white dark:bg-[#0a1628] text-green-600 dark:text-green-400 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Finalizados</span>
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
            mainTab === 'finalizados' ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400' : 'bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-gray-400'
          }`}>
            {leads.filter(l => l.status === 'finalizado').length}
          </span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════
          ABA: CLIENTES / PRODUÇÃO
      ══════════════════════════════════════════════════════════ */}
      {mainTab === 'producao' && (
        <ProducaoTab
          leads={leads.filter(l => l.status === 'convertido')}
          userId={userId}
          templates={templates}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          onWorkflowChange={handleWorkflowChange}
          onLeadFinalizado={handleLeadFinalizado}
          onSolicitarAvaliacao={handleSolicitarAvaliacao}
        />
      )}

      {/* ══════════════════════════════════════════════════════════
          ABA: FINALIZADOS
      ══════════════════════════════════════════════════════════ */}
      {mainTab === 'finalizados' && (
        <FinalizadosTab
          leads={leads.filter(l => l.status === 'finalizado')}
          userId={userId}
          templates={templates}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          onSolicitarAvaliacao={handleSolicitarAvaliacao}
          onReativar={async (lead) => {
            await supabase.from('leads').update({ status: 'convertido' }).eq('id', lead.id);
            setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: 'convertido' } : l));
            setMainTab('producao');
          }}
        />
      )}

      {/* ══════════════════════════════════════════════════════════
          ABA: TIMELINE (LEADS) — conteúdo original abaixo
      ══════════════════════════════════════════════════════════ */}
      {mainTab === 'leads' && (
      <>

      {/* Banner de Upgrade para Plano Gratuito */}
      {!planLimits.isPremium && (
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-[rgba(59,130,246,0.1)] dark:to-[rgba(59,130,246,0.15)] border border-blue-200 dark:border-[rgba(59,130,246,0.2)] rounded-lg p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <Crown className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-1">
                  Plano Gratuito: Máximo {planLimits.leadsLimit} leads
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  Você tem {planLimits.leadsUsed} de {planLimits.leadsLimit} leads salvos. 
                  Quando atingir o limite, novos leads substituirão os mais antigos automaticamente.
                  Faça upgrade para leads ilimitados!
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors font-medium text-sm whitespace-nowrap"
            >
              <TrendingUp className="w-4 h-4" />
              Fazer Upgrade
            </button>
          </div>
        </div>
      )}

      {/* Aviso de Limite Próximo */}
      {!planLimits.isPremium && planLimits.leadsLimit !== 'unlimited' && planLimits.leadsUsed >= planLimits.leadsLimit * 0.8 && (
        <div className="bg-yellow-50 dark:bg-[rgba(234,179,8,0.1)] border border-yellow-200 dark:border-[rgba(234,179,8,0.2)] rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-900 dark:text-yellow-300">
                {planLimits.leadsUsed >= planLimits.leadsLimit 
                  ? 'Limite de leads atingido!' 
                  : 'Você está próximo do limite de leads!'}
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                {planLimits.leadsUsed >= planLimits.leadsLimit
                  ? 'Novos leads substituirão os mais antigos automaticamente. Faça upgrade para não perder seus dados!'
                  : `Faltam apenas ${planLimits.leadsLimit - planLimits.leadsUsed} lead(s) para atingir o limite. Considere fazer upgrade para leads ilimitados.`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 dark:bg-[rgba(59,130,246,0.1)] border border-blue-200 dark:border-[rgba(59,130,246,0.2)] rounded-lg p-4">
          <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total de Leads</div>
          <div className="text-2xl font-bold text-blue-900 dark:text-blue-300">{stats.total}</div>
          {!planLimits.isPremium && planLimits.leadsLimit !== 'unlimited' && (
            <div className={`text-xs mt-1 font-medium ${getLeadsLimitColor()}`}>
              {planLimits.leadsUsed} / {planLimits.leadsLimit} salvos
            </div>
          )}
        </div>
        <div className="bg-yellow-50 dark:bg-[rgba(234,179,8,0.1)] border border-yellow-200 dark:border-[rgba(234,179,8,0.2)] rounded-lg p-4">
          <div className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">Novos</div>
          <div className="text-2xl font-bold text-yellow-900 dark:text-yellow-300">{stats.novos}</div>
        </div>
        <div className="bg-gray-50 dark:bg-[rgba(255,255,255,0.05)] border border-gray-200 dark:border-[rgba(255,255,255,0.1)] rounded-lg p-4">
          <div className="text-sm text-gray-600 dark:text-[rgba(255,255,255,0.5)] font-medium">Abandonados</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.abandonados}</div>
        </div>
        <div className="bg-green-50 dark:bg-[rgba(34,197,94,0.1)] border border-green-200 dark:border-[rgba(34,197,94,0.2)] rounded-lg p-4">
          <div className="text-sm text-green-600 dark:text-green-400 font-medium">Taxa de Conversão</div>
          <div className="text-2xl font-bold text-green-900 dark:text-green-300">{stats.taxaConversao}%</div>
        </div>
      </div>

      {/* ── Tabs de Template ─────────────────────────────────────── */}
      {templateTabs.length > 1 && (
        <div className="flex flex-wrap gap-2 pb-1 border-b border-gray-200 dark:border-[rgba(255,255,255,0.1)]">
          <button
            onClick={() => { setFilterTemplate('all'); setFilter('all'); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              filterTemplate === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 dark:bg-[rgba(255,255,255,0.05)] text-gray-600 dark:text-[rgba(255,255,255,0.6)] hover:bg-gray-200 dark:hover:bg-[rgba(255,255,255,0.1)]'
            }`}
          >
            Todos os Templates
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              filterTemplate === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-300 dark:bg-[rgba(255,255,255,0.2)] text-gray-700 dark:text-white'
            }`}>{leads.length}</span>
          </button>
          {templateTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setFilterTemplate(tab.id); setFilter('all'); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                filterTemplate === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-[rgba(255,255,255,0.05)] text-gray-600 dark:text-[rgba(255,255,255,0.6)] hover:bg-gray-200 dark:hover:bg-[rgba(255,255,255,0.1)]'
              }`}
            >
              {tab.nome}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                filterTemplate === tab.id ? 'bg-indigo-500 text-white' : 'bg-gray-300 dark:bg-[rgba(255,255,255,0.2)] text-gray-700 dark:text-white'
              }`}>{tab.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Filtros de Status ─────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-[rgba(255,255,255,0.05)] text-gray-700 dark:text-[rgba(255,255,255,0.7)] hover:bg-gray-200 dark:hover:bg-[rgba(255,255,255,0.1)]'
          }`}
        >
          Todos ({templateFilteredLeads.length})
        </button>
        {(['novo', 'abandonado', 'contatado', 'em_negociacao', 'fazer_followup', 'convertido', 'perdido'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-[rgba(255,255,255,0.05)] text-gray-700 dark:text-[rgba(255,255,255,0.7)] hover:bg-gray-200 dark:hover:bg-[rgba(255,255,255,0.1)]'
            }`}
          >
            {status === 'em_negociacao' ? 'Em Negociação' : status === 'fazer_followup' ? 'Follow-up' : status.charAt(0).toUpperCase() + status.slice(1)}
            {' '}({templateFilteredLeads.filter(l => l.status === status).length})
          </button>
        ))}
        {selectedIds.length > 0 && (
          <button
            onClick={() => setDeleteConfirmMultiple(true)}
            disabled={isDeleting}
            className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-500 transition-colors disabled:bg-red-300 dark:disabled:bg-[rgba(239,68,68,0.5)]"
          >
            {isDeleting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            Excluir ({selectedIds.length})
          </button>
        )}
        <div className="ml-auto flex items-center gap-2">
          {/* Botão Importar Código */}
          <button
            onClick={() => setShowImportJsonModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-150 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-250 border dark:border-white/5 rounded-lg font-semibold text-sm transition-all shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Importar Código
          </button>
          
          {/* Botão Novo Lead */}
          <button
            id="btn-novo-lead"
            onClick={() => setShowNewLeadModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-lg font-semibold text-sm transition-all shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Novo Lead
          </button>
        </div>
        <div className="flex items-center gap-1 bg-gray-200 dark:bg-[#07101f] p-1 rounded-lg">
          <button 
            onClick={() => setLeadsViewMode('grid')}
            className={`p-1.5 rounded-md transition-colors ${leadsViewMode === 'grid' ? 'bg-white dark:bg-[#1a2b42] text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            title="Visualização em Grade"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setLeadsViewMode('list')}
            className={`p-1.5 rounded-md transition-colors ${leadsViewMode === 'list' ? 'bg-white dark:bg-[#1a2b42] text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            title="Visualização em Lista"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Lista de Leads */}
      <div className="bg-white dark:bg-[#0a1628] rounded-lg shadow dark:shadow-none overflow-hidden">
        {filteredLeads.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-[rgba(255,255,255,0.4)]">
            Nenhum lead encontrado para este filtro.
          </div>
        ) : leadsViewMode === 'list' ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-[rgba(255,255,255,0.08)]">
              <thead className="bg-gray-50 dark:bg-[#07101f]">
                <tr>
                  <th className="p-4">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={selectedIds.length > 0 && selectedIds.length === filteredLeads.length}
                      className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-[#0a1628] border-gray-300 dark:border-[rgba(255,255,255,0.1)] rounded focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-[rgba(255,255,255,0.5)] uppercase tracking-wider">Cliente</th>
                  <th className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-[rgba(255,255,255,0.5)] uppercase tracking-wider">Contato</th>
                  <th className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-[rgba(255,255,255,0.5)] uppercase tracking-wider">Orçamento</th>
                  <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-[rgba(255,255,255,0.5)] uppercase tracking-wider">Evento</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-[rgba(255,255,255,0.5)] uppercase tracking-wider">Valor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-[rgba(255,255,255,0.5)] uppercase tracking-wider">Status</th>
                  <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-[rgba(255,255,255,0.5)] uppercase tracking-wider">Data</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-[rgba(255,255,255,0.5)] uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-[#0a1628] divide-y divide-gray-200 dark:divide-[rgba(255,255,255,0.08)]">
                {filteredLeads.map((lead: LeadWithReview) => (
                  <tr key={lead.id} className={`hover:bg-gray-50 dark:hover:bg-[rgba(255,255,255,0.04)] ${selectedIds.includes(lead.id) ? 'bg-blue-50 dark:bg-[rgba(59,130,246,0.1)]' : ''}`}>
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(lead.id)}
                        onChange={() => setSelectedIds(prev => prev.includes(lead.id) ? prev.filter(id => id !== lead.id) : [...prev, lead.id])}
                        className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-[#0a1628] border-gray-300 dark:border-[rgba(255,255,255,0.1)] rounded focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap flex items-center gap-2">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {lead.nome_cliente || 'Não informado'}
                      </div>
                      {isCollabLead(lead) && (
                        <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm" title="Lead com produtos de co-parceria (Collab)">
                          🤝 Collab
                        </span>
                      )}
                      {contracts[lead.id] && (
                        <span title="Contrato gerado para este lead"><CheckSquare className="w-4 h-4 text-purple-600 dark:text-purple-400 ml-2" /></span>
                      )}
                    </td>
                    <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">{lead.telefone_cliente || '—'}</div>
                      <div className="text-sm text-gray-500 dark:text-[rgba(255,255,255,0.5)]">{lead.email_cliente || '—'}</div>
                    </td>
                    <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {templates[lead.template_id]?.nome_template || 'Template não encontrado'}
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap"> {/* Corrigido: Removido o duplicado de data e cidade */}
                      <div className="text-sm text-gray-900 dark:text-white">{lead.tipo_evento || '—'}</div>
                      <div className="text-sm text-gray-500 dark:text-[rgba(255,255,255,0.5)]">
                        {lead.data_evento ? formatDate(lead.data_evento) : '—'}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-[rgba(255,255,255,0.5)]">{cities[lead.cidade_evento || '']?.nome || lead.cidade_evento || '—'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(lead.valor_total)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(lead.status)}</td>
                    <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-[rgba(255,255,255,0.5)]">
                      <div className="font-medium text-gray-900 dark:text-white">{formatDate(lead.data_orcamento)}</div>
                      <div className="text-xs text-gray-500 dark:text-[rgba(255,255,255,0.4)]">{new Date(lead.data_orcamento).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {lead.telefone_cliente && (
                        <button
                          onClick={() => sendWhatsAppMessage(lead)}
                          className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300"
                          title="Enviar mensagem via WhatsApp"
                        >
                          💬
                        </button>
                      )}
                      <button
                        onClick={() => setContractLead(lead)}
                        className="text-purple-600 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-300 disabled:text-gray-400 dark:disabled:text-[rgba(255,255,255,0.2)] disabled:cursor-not-allowed"
                        title="Gerar contrato"
                        disabled={contracts[lead.id]}
                      >
                        <FileSignature className="w-4 h-4 inline" />
                      </button>
                      {(lead.status === 'convertido' || lead.status === 'finalizado') && lead.telefone_cliente && (
                        <button 
                          onClick={() => handleSolicitarAvaliacao(lead)}
                          className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-900 dark:hover:text-yellow-300"
                          title="Solicitar avaliação do cliente"
                        >
                          <Star className="w-4 h-4 inline" />
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedLead(lead)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                        title="Ver detalhes"
                      >
                        👁️
                      </button>
                      <button
                        onClick={() => handleDuplicateLead(lead)}
                        disabled={duplicatingIds.has(lead.id)}
                        className={`text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 ${duplicatingIds.has(lead.id) ? 'animate-pulse opacity-50 cursor-not-allowed' : ''}`}
                        title="Duplicar lead"
                      >
                        {duplicatingIds.has(lead.id) ? (
                          <div className="w-4 h-4 inline-block border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => setDeleteConfirmSingle(lead.id)}
                        className={`text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 ${deletingIds.has(lead.id) ? 'animate-pulse opacity-50 cursor-not-allowed' : ''}`}
                        title="Excluir lead"
                        disabled={deletingIds.has(lead.id)}
                      >
                        <Trash2 className="w-4 h-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredLeads.map((lead: LeadWithReview) => (
              <div 
                key={lead.id}
                className={`relative p-5 rounded-xl border transition-all ${
                  selectedIds.includes(lead.id) 
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-md' 
                    : 'border-gray-200 dark:border-white/[0.07] bg-white dark:bg-[#0a1628] hover:border-indigo-300 dark:hover:border-indigo-700 shadow-sm'
                }`}
              >
                <div className="absolute top-3 right-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(lead.id)}
                    onChange={() => setSelectedIds(prev => prev.includes(lead.id) ? prev.filter(id => id !== lead.id) : [...prev, lead.id])}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                </div>
                <div className="mb-3 pr-6">
                  <h3 className="font-bold text-gray-900 dark:text-white truncate flex items-center gap-2" title={lead.nome_cliente || undefined}>
                    {lead.nome_cliente || 'Não informado'}
                    {isCollabLead(lead) && (
                      <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm" title="Lead com produtos de co-parceria (Collab)">
                        🤝 Collab
                      </span>
                    )}
                    {contracts[lead.id] && (
                      <span title="Contrato Gerado">
                        <CheckSquare className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      </span>
                    )}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusBadge(lead.status)}
                    <span className="text-xs text-gray-500 dark:text-[rgba(255,255,255,0.5)]">
                      {formatDate(lead.data_orcamento)}
                    </span>
                  </div>
                </div>
                <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mb-4">
                  {formatCurrency(lead.valor_total)}
                </div>
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-[rgba(255,255,255,0.7)]">
                    <span className="w-4 text-center">📋</span>
                    <span className="truncate flex-1">{templates[lead.template_id]?.nome_template || 'Template não encontrado'}</span>
                  </div>
                  {lead.data_evento && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-[rgba(255,255,255,0.7)]">
                      <span className="w-4 text-center">📅</span>
                      <span className="truncate flex-1">{formatDate(lead.data_evento)}</span>
                    </div>
                  )}
                  {lead.telefone_cliente && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-[rgba(255,255,255,0.7)]">
                      <span className="w-4 text-center">📱</span>
                      <span className="truncate flex-1">{lead.telefone_cliente}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-[rgba(255,255,255,0.1)]">
                  <button
                    onClick={() => setSelectedLead(lead)}
                    className="flex-1 px-3 py-1.5 text-xs font-semibold bg-gray-100 dark:bg-[rgba(255,255,255,0.05)] text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-[rgba(255,255,255,0.1)] transition-colors"
                  >
                    Ver detalhes
                  </button>
                  {lead.telefone_cliente && (
                    <button
                      onClick={() => sendWhatsAppMessage(lead)}
                      className="p-1.5 text-green-600 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 rounded-lg transition-colors"
                      title="WhatsApp"
                    >
                      💬
                    </button>
                  )}
                  <button
                    onClick={() => setContractLead(lead)}
                    disabled={contracts[lead.id]}
                    className="p-1.5 text-purple-600 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/40 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Contrato"
                  >
                    <FileSignature className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDuplicateLead(lead)}
                    disabled={duplicatingIds.has(lead.id)}
                    className={`p-1.5 text-indigo-500 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 rounded-lg transition-colors ${duplicatingIds.has(lead.id) ? 'animate-pulse opacity-50 cursor-not-allowed' : ''}`}
                    title="Duplicar lead"
                  >
                    {duplicatingIds.has(lead.id) ? (
                      <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Detalhes */}
      {selectedLead && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#0a1628] rounded-lg shadow-xl border dark:border-[rgba(255,255,255,0.05)] max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Detalhes do Lead</h2>
                <button
                  onClick={() => setSelectedLead(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-[rgba(255,255,255,0.6)]"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 text-gray-900 dark:text-[rgba(255,255,255,0.8)]">
                <div>
                  <h3 className="font-semibold text-gray-700 dark:text-white">Informações do Cliente</h3>
                  <div className="mt-2 space-y-1">
                    <p><strong>Nome:</strong> {selectedLead.nome_cliente || '—'}</p>
                    <p><strong>Email:</strong> {selectedLead.email_cliente || '—'}</p>
                    <p><strong>Telefone:</strong> {selectedLead.telefone_cliente || '—'}</p>
                    <p className="text-sm text-gray-500 dark:text-[rgba(255,255,255,0.5)] mt-2">
                      <strong className="text-gray-900 dark:text-[rgba(255,255,255,0.8)]">📅 Solicitação feita em:</strong> {formatDateTime(selectedLead.data_orcamento)}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-700 dark:text-white">Origem do Lead</h3>
                  <div className="mt-2 space-y-1">
                    <p><strong>Orçamento:</strong> {templates[selectedLead.template_id]?.nome_template || 'Template não encontrado'}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-700 dark:text-white">Informações do Evento</h3>
                  <div className="mt-2 space-y-1">
                    <p><strong>Tipo:</strong> {selectedLead.tipo_evento || '—'}</p> {/* Corrigido: Removido o duplicado de data e cidade */}
                    <p><strong>Data:</strong> {selectedLead.data_evento ? formatDate(selectedLead.data_evento) : '—'}
                      {disponibilidadeLead && (
                        <span className={`ml-2 text-xs font-semibold px-2 py-1 rounded-full ${disponibilidadeLead.status === 'disponivel' ? 'bg-green-100 dark:bg-[rgba(34,197,94,0.2)] text-green-800 dark:text-green-400' : 'bg-red-100 dark:bg-[rgba(239,68,68,0.2)] text-red-800 dark:text-red-400'}`}>{disponibilidadeLead.mensagem}</span>
                      )
                      }
                    </p>
                    <p><strong>Cidade:</strong> {cities[selectedLead.cidade_evento || '']?.nome || selectedLead.cidade_evento || '—'}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-700 dark:text-white">Orçamento</h3>
                  <div className="flex justify-between items-center bg-gray-50 dark:bg-[rgba(255,255,255,0.02)] p-4 rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.05)] mt-2">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-[rgba(255,255,255,0.5)]">Valor Total Negociado</p>
                      <p className="text-xl font-bold text-blue-700 dark:text-blue-400">{formatCurrency(selectedLead.valor_total)}</p>
                    </div>
                    {detalhesOrcamento && !loadingDetalhes && (
                      <button
                        onClick={() => setEditingLeadQuote({lead: selectedLead, detalhes: detalhesOrcamento})}
                        className="px-4 py-2 bg-white dark:bg-[#07101f] border border-blue-200 dark:border-[rgba(59,130,246,0.5)] text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-[rgba(59,130,246,0.1)] text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 shadow-sm"
                      >
                        <Edit3 className="w-4 h-4" />
                        Editar Pacote
                      </button>
                    )}
                  </div>
                  {loadingDetalhes ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-500 dark:text-[rgba(255,255,255,0.5)]">Carregando detalhes do orçamento...</p>
                    </div>
                  ) : detalhesOrcamento && detalhesOrcamento.selectedProdutos && (
                    <>
                      {Object.keys(detalhesOrcamento.selectedProdutos).length > 0 && (() => {
                        const selectedProds = (detalhesOrcamento.produtos || []).filter(
                          p => detalhesOrcamento.selectedProdutos?.[p.id] > 0
                        );
                        const selectedUpsells = detalhesOrcamento.upsell_produtos || [];

                        // Agrupar por provedor_id
                        const groups: Record<string, { prods: any[], upsells: any[] }> = {};

                        // Inicializar grupo do dono
                        groups[selectedLead.user_id || userId] = { prods: [], upsells: [] };

                        selectedProds.forEach(p => {
                          const provId = p.provedor_id || selectedLead.user_id || userId;
                          if (!groups[provId]) groups[provId] = { prods: [], upsells: [] };
                          groups[provId].prods.push(p);
                        });

                        selectedUpsells.forEach(p => {
                          const provId = p.provedor_id || selectedLead.user_id || userId;
                          if (!groups[provId]) groups[provId] = { prods: [], upsells: [] };
                          groups[provId].upsells.push(p);
                        });

                        return (
                          <div className="mt-4 space-y-4">
                            <h4 className="font-semibold text-gray-700 dark:text-white border-b border-gray-100 dark:border-white/[0.05] pb-2">
                              📦 Itens Selecionados por Provedor:
                            </h4>
                            {Object.entries(groups).map(([provId, group]) => {
                              if (group.prods.length === 0 && group.upsells.length === 0) return null;

                              const isOwner = provId === selectedLead.user_id || provId === userId;
                              const profile = collabProfiles[provId];
                              const providerName = isOwner 
                                ? 'Seus Serviços (Dono do Orçamento)' 
                                : `🤝 Collab: ${profile?.nome_profissional || profile?.nome_admin || profile?.nome || 'Parceiro'}`;

                              return (
                                <div key={provId} className="bg-gray-50 dark:bg-white/[0.02] p-3 rounded-lg border border-gray-100 dark:border-white/[0.05]">
                                  <h5 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-2 uppercase tracking-wider">
                                    {providerName}
                                  </h5>
                                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-800 dark:text-gray-200">
                                    {group.prods.map(p => (
                                      <li key={p.id}>{`${detalhesOrcamento.selectedProdutos[p.id]}x ${p.nome} (${formatCurrency(p.valor)})`}</li>
                                    ))}
                                    {group.upsells.map(p => (
                                      <li key={p.id}>{`• ${p.nome} (Upsell) - (${formatCurrency(p.valor)})`}</li>
                                    ))}
                                  </ul>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                      {detalhesOrcamento.paymentMethod && (
                        <div className="mt-3">
                          <p className="text-sm"><strong>Forma de Pagamento:</strong> {detalhesOrcamento.paymentMethod.nome}</p>
                        </div>
                      )}
                      {detalhesOrcamento.customFields && detalhesOrcamento.customFields.length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-semibold text-gray-600 dark:text-[rgba(255,255,255,0.8)]">Respostas Adicionais:</h4>
                          <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-gray-800 dark:text-gray-200">
                            {detalhesOrcamento.customFields
                              .filter(field => detalhesOrcamento.customFieldsData && detalhesOrcamento.customFieldsData[field.id])
                              .map(field => (
                                <li key={field.id}>
                                  <strong>{field.label}:</strong> {detalhesOrcamento.customFieldsData?.[field.id]}
                                </li>
                              ))}
                          </ul>
                        </div>
                      )}
                      {/* Displaying custom fields that were filled out */}
                      {detalhesOrcamento.customFieldsData && Object.keys(detalhesOrcamento.customFieldsData).length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-semibold text-gray-600 dark:text-[rgba(255,255,255,0.8)]">Campos Personalizados Preenchidos:</h4>
                          <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-gray-800 dark:text-gray-200">
                            {detalhesOrcamento.customFields // Iterar sobre a definição dos campos
                              .filter(field => detalhesOrcamento.customFieldsData?.[field.id]) // Filtrar os que têm dados preenchidos
                              .map(field => ( // Mapear para exibir
                                <li key={field.id}>
                                  <strong>{field.label}:</strong> {detalhesOrcamento.customFieldsData?.[field.id]}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Prévia da Mensagem do WhatsApp */}
                <div className="mt-6">
                  <h3 className="font-semibold text-gray-700 dark:text-white">Prévia da Mensagem de Follow-up</h3>
                  {loadingDetalhes ? (
                     <p className="text-sm text-gray-500 dark:text-[rgba(255,255,255,0.5)] mt-2">Gerando prévia...</p>
                  ) : (
                    <div className="mt-2 p-4 bg-gray-50 dark:bg-[rgba(255,255,255,0.02)] border border-gray-200 dark:border-[rgba(255,255,255,0.05)] rounded-lg">
                      <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-[rgba(255,255,255,0.8)] font-sans">
                        {whatsappMessageBody || 'Não foi possível gerar a prévia da mensagem.'}
                      </pre>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="font-semibold text-gray-700 dark:text-white">Atualizar Status</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(['novo', 'contatado', 'em_negociacao', 'fazer_followup', 'convertido', 'perdido', 'abandonado'] as const).map((status: Lead['status']) => (
                      <button
                        key={status}
                        onClick={() => updateLeadStatus(selectedLead.id, status)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium ${
                          selectedLead.status === status
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-gray-200 dark:bg-[rgba(255,255,255,0.1)] text-gray-700 dark:text-[rgba(255,255,255,0.8)] hover:bg-gray-300 dark:hover:bg-[rgba(255,255,255,0.2)]'
                        }`}
                      >
                        {status === 'em_negociacao' ? '🤝 Em Negociação' : status === 'fazer_followup' ? '📞 Follow-up' : status.charAt(0).toUpperCase() + status.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Painel Collab de Fechamento / Compartilhamento */}
                {isCollabLead(selectedLead) && detalhesOrcamento && (
                  <div className="border-t border-gray-200 dark:border-[rgba(255,255,255,0.08)] pt-4 mt-4 bg-purple-50/20 dark:bg-purple-950/10 p-4 rounded-xl border border-purple-100 dark:border-purple-900/30">
                    <h3 className="font-semibold text-gray-700 dark:text-white mb-2 flex items-center gap-2">
                      🤝 Compartilhamento de Collab (Fechar com Parceiros)
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                      Este orçamento possui serviços de parceiros. Quando a venda for fechada, você pode exportar a parte de cada um para que eles importem em suas contas.
                    </p>

                    <div className="space-y-3">
                      {Object.keys(collabProfiles).map(provId => {
                        const prods = (detalhesOrcamento.produtos || []).filter(
                          p => p.provedor_id === provId && detalhesOrcamento.selectedProdutos?.[p.id] > 0
                        );
                        const upsells = (detalhesOrcamento.upsell_produtos || []).filter(
                          p => p.provedor_id === provId
                        );

                        if (prods.length === 0 && upsells.length === 0) return null;

                        const profile = collabProfiles[provId];
                        const partnerName = profile?.nome_profissional || profile?.nome_admin || profile?.nome || 'Parceiro';

                        // Calcular subtotal de produtos do parceiro
                        const baseVal = prods.reduce((sum, p) => sum + p.valor * (detalhesOrcamento.selectedProdutos[p.id] || 1), 0);
                        const upsellVal = upsells.reduce((sum, p) => sum + p.valor, 0);
                        let subtotalParceiro = baseVal + upsellVal;

                        // Aplicar desconto de cupom proporcional se houver
                        const breakdown = detalhesOrcamento.priceBreakdown;
                        if (breakdown.descontoCupom > 0 && breakdown.subtotal > 0) {
                          const pctCupom = breakdown.descontoCupom / breakdown.subtotal;
                          subtotalParceiro -= subtotalParceiro * pctCupom;
                        }

                        // Rateio de Taxa de Deslocamento
                        let taxaParceiro = 0;
                        const totalTaxa = breakdown.ajusteGeografico?.taxa || 0;

                        if (totalTaxa > 0) {
                          // Buscar regra do template
                          const templateInfo = templates[selectedLead.template_id];
                          const regra = templateInfo?.collab_regra_deslocamento || 'owner_100';

                          if (regra === 'equal_split') {
                            // Conta quantos provedores únicos participam com produtos ativos
                            const activeProviders = new Set<string>();
                            (detalhesOrcamento.produtos || []).forEach((p: any) => {
                              if (detalhesOrcamento.selectedProdutos?.[p.id] > 0) activeProviders.add(p.provedor_id || selectedLead.user_id || userId);
                            });
                            (detalhesOrcamento.upsell_produtos || []).forEach((p: any) => {
                              activeProviders.add(p.provedor_id || selectedLead.user_id || userId);
                            });
                            const count = activeProviders.size;
                            taxaParceiro = totalTaxa / (count || 1);
                          } else if (regra === 'proportional') {
                            taxaParceiro = totalTaxa * (subtotalParceiro / (breakdown.subtotal || 1));
                          } else if (regra === 'manual_split') {
                            const pctManual = templateInfo?.collab_valores_manuais?.[provId] ?? 0;
                            taxaParceiro = (totalTaxa * pctManual) / 100;
                          }
                        }

                        const valorTotalParceiro = subtotalParceiro + taxaParceiro;

                        // Função para gerar o link de importação do parceiro
                        const handleExportPartnerLead = () => {
                          const exportData = {
                            nome_cliente: selectedLead.nome_cliente,
                            email_cliente: selectedLead.email_cliente,
                            telefone_cliente: selectedLead.telefone_cliente,
                            valor_total: valorTotalParceiro,
                            dados_formulario: selectedLead.dados_formulario,
                            orcamento_detalhe: {
                              produtos: prods,
                              upsell_produtos: upsells,
                              selectedProdutos: prods.reduce((acc, p) => ({ ...acc, [p.id]: detalhesOrcamento.selectedProdutos[p.id] }), {}),
                              priceBreakdown: {
                                subtotal: subtotalParceiro,
                                total: valorTotalParceiro,
                                ajusteGeografico: {
                                  taxa: taxaParceiro,
                                  percentual: 0
                                }
                              }
                            },
                            data_evento: selectedLead.data_evento,
                            cidade_evento: selectedLead.cidade_evento,
                            tipo_evento: selectedLead.tipo_evento,
                          };

                          const base64Code = btoa(unescape(encodeURIComponent(JSON.stringify(exportData))));
                          const importUrl = `${window.location.origin}${window.location.pathname}?import=${base64Code}`;
                          navigator.clipboard.writeText(importUrl);
                          alert(`✅ Link de importação de Collab para ${partnerName} copiado com sucesso! Envie o link a ele pelo WhatsApp.`);
                        };

                        return (
                          <div key={provId} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-white dark:bg-[#07101f] border border-purple-100 dark:border-purple-900/30 rounded-lg gap-2 shadow-sm">
                            <div>
                              <p className="text-sm font-semibold text-gray-800 dark:text-white">{partnerName}</p>
                              <p className="text-xs text-gray-500">
                                Valor Calculado: <span className="font-bold text-purple-700 dark:text-purple-400">{formatCurrency(valorTotalParceiro)}</span> (Produtos: {formatCurrency(subtotalParceiro)} + Taxa: {formatCurrency(taxaParceiro)})
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={handleExportPartnerLead}
                              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-xs transition-colors flex items-center gap-1 shrink-0"
                            >
                              📋 Copiar Link
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Painel de Agendamento de Ensaio */}
                <div className="border-t border-gray-200 dark:border-[rgba(255,255,255,0.08)] pt-4 mt-4">
                  <h3 className="font-semibold text-gray-700 dark:text-white mb-2 flex items-center gap-2">
                    📅 Agendamento Online de Ensaio / Pre-Casamento
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    Configure as datas disponíveis para o cliente escolher e agendar sem precisar preencher formulários adicionais.
                  </p>

                  <div className="bg-gray-50 dark:bg-[rgba(255,255,255,0.02)] p-4 rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.05)] space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Modalidade do Agendamento</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setBookingMode('avulso')}
                          className={`py-2 px-3 border text-xs font-bold rounded-lg transition-colors ${
                            bookingMode === 'avulso'
                              ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400'
                              : 'border-gray-200 hover:border-gray-300 dark:border-white/10 dark:text-white'
                          }`}
                        >
                          Sugerir Datas (Avulso)
                        </button>
                        <button
                          type="button"
                          onClick={() => setBookingMode('dinamico')}
                          className={`py-2 px-3 border text-xs font-bold rounded-lg transition-colors ${
                            bookingMode === 'dinamico'
                              ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400'
                              : 'border-gray-200 hover:border-gray-300 dark:border-white/10 dark:text-white'
                          }`}
                        >
                          Calendário Livre (Dinâmico)
                        </button>
                      </div>
                    </div>

                    {bookingMode === 'avulso' ? (
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400">Escolha as datas sugeridas (Máx 5):</label>
                        
                        {/* Aviso de datas ocupadas */}
                        {loadingBusy ? (
                          <p className="text-[10px] text-gray-400">Carregando agenda...</p>
                        ) : busyDaysPreview.size > 0 && (
                          <div className="text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800">
                            ⚠️ <strong>Datas já ocupadas na agenda:</strong>{' '}
                            {Array.from(busyDaysPreview).sort().slice(0,5).map(d => new Date(d+'T00:00:00').toLocaleDateString('pt-BR')).join(', ')}
                            {busyDaysPreview.size > 5 && ` +${busyDaysPreview.size - 5} mais`}
                          </div>
                        )}

                        <div className="flex gap-2">
                          <input
                            type="date"
                            value={newDateInput}
                            onChange={(e) => setNewDateInput(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className={`flex-1 px-3 py-1.5 text-sm border rounded-lg bg-white dark:bg-[#0c1b30] dark:text-white ${
                              newDateInput && busyDaysPreview.has(newDateInput)
                                ? 'border-red-400 bg-red-50 dark:bg-red-950/30'
                                : 'border-gray-300 dark:border-white/10'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (!newDateInput) return;
                              if (bookingDates.includes(newDateInput)) {
                                alert('Esta data já foi adicionada.');
                                return;
                              }
                              if (bookingDates.length >= 5) {
                                alert('Você pode sugerir no máximo 5 datas.');
                                return;
                              }
                              if (busyDaysPreview.has(newDateInput)) {
                                const ok = window.confirm(`⚠️ Esta data (${new Date(newDateInput+'T00:00:00').toLocaleDateString('pt-BR')}) já tem um evento na sua agenda. Deseja adicioná-la mesmo assim?`);
                                if (!ok) return;
                              }
                              setBookingDates([...bookingDates, newDateInput].sort());
                              setNewDateInput('');
                            }}
                            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            + Adicionar
                          </button>
                        </div>

                        {newDateInput && busyDaysPreview.has(newDateInput) && (
                          <p className="text-[10px] text-red-600 dark:text-red-400 font-semibold">⛔ Esta data já está ocupada na sua agenda!</p>
                        )}

                        {bookingDates.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 pt-2">
                            {bookingDates.map((date) => (
                              <span
                                key={date}
                                className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                                  busyDaysPreview.has(date)
                                    ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
                                    : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-900'
                                }`}
                              >
                                {busyDaysPreview.has(date) && <span title="Data ocupada">⚠️</span>}
                                {new Date(date + 'T00:00:00').toLocaleDateString('pt-BR')}
                                <button
                                  type="button"
                                  onClick={() => setBookingDates(bookingDates.filter(d => d !== date))}
                                  className="text-red-500 hover:text-red-700 font-bold ml-1 text-sm leading-none"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500 italic">Nenhuma data adicionada. O cliente não poderá agendar.</p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Mês de Referência Inicial</label>
                        <input
                          type="month"
                          value={bookingMonth}
                          onChange={(e) => setBookingMonth(e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-[#0c1b30] dark:text-white"
                        />
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">O cliente abrirá a agenda diretamente neste mês para escolher qualquer data livre. Datas já ocupadas na sua agenda serão bloqueadas automaticamente.</p>
                        {busyDaysPreview.size > 0 && (
                          <div className="text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800">
                            🔒 <strong>{busyDaysPreview.size} data(s) já bloqueadas</strong> na sua agenda (o cliente não poderá selecioná-las).
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => loadBusyDaysPreview(userId)}
                          disabled={loadingBusy}
                          className="text-[10px] text-blue-600 dark:text-blue-400 underline"
                        >
                          {loadingBusy ? 'Atualizando...' : '🔄 Atualizar datas ocupadas'}
                        </button>
                      </div>
                    )}

                    <div className="flex gap-2 justify-end pt-2 border-t border-gray-150 dark:border-white/5">
                      <button
                        type="button"
                        onClick={handleSaveBookingConfig}
                        disabled={savingBookingConfig}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1"
                      >
                        {savingBookingConfig ? 'Salvando...' : 'Salvar Configuração'}
                      </button>
                    </div>

                    {/* Exibir o link se configurado e salvo no lead */}
                    {selectedLead.agendamento_config && (
                      <div className="bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-100 dark:border-blue-900 mt-2 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-blue-800 dark:text-blue-300">Link para o Cliente:</span>
                          <button
                            type="button"
                            onClick={() => {
                              const bookingLink = `${window.location.origin}/agendar/${selectedLead.id}`;
                              navigator.clipboard.writeText(bookingLink);
                              setCopiedBookingLink(true);
                              setTimeout(() => setCopiedBookingLink(false), 2000);
                            }}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-bold"
                          >
                            {copiedBookingLink ? '✓ Copiado!' : 'Copiar Link'}
                          </button>
                        </div>
                        <code className="block text-[11px] bg-white dark:bg-[#0c1b30] p-2 rounded border border-blue-100 dark:border-blue-900 text-blue-700 dark:text-blue-300 font-mono break-all leading-tight">
                          {`${window.location.origin}/agendar/${selectedLead.id}`}
                        </code>
                        
                        {/* Enviar link pelo WhatsApp */}
                        <button
                          type="button"
                          onClick={() => {
                            const bookingLink = `${window.location.origin}/agendar/${selectedLead.id}`;
                            const msg = `Olá, ${selectedLead.nome_cliente || 'cliente'}! Segue o link para você escolher a melhor data para o nosso agendamento: ${bookingLink}`;
                            const link = generateWaLinkToClient(selectedLead.telefone_cliente || '', msg);
                            window.open(link, '_blank');
                          }}
                          className="w-full py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          Enviar Convite de Agendamento via WhatsApp
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Exportar Lead para Co-parceria */}
                <div className="border-t border-gray-200 dark:border-[rgba(255,255,255,0.08)] pt-4 mt-4 space-y-3">
                  <h3 className="font-semibold text-gray-700 dark:text-white mb-1 flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-500" />
                    Compartilhar Lead (Copiar Código)
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Copie o código do lead abaixo e envie para o seu parceiro. Ele poderá colar esse código no painel dele para importar este lead de forma simples.
                  </p>
                  
                  <div className="bg-gray-50 dark:bg-[#07101f] p-3 rounded-lg border dark:border-[rgba(255,255,255,.05)] flex flex-col gap-2.5">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={selectedLead ? getLeadExportCode(selectedLead) : ''}
                        className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-100 dark:bg-[#0c192c] text-xs text-gray-500 dark:text-gray-400 select-all outline-none font-mono truncate"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          if (selectedLead) {
                            const code = getLeadExportCode(selectedLead);
                            await navigator.clipboard.writeText(code);
                            alert('📋 Código do lead copiado com sucesso! Envie para seu parceiro PriceUs.');
                          }
                        }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm whitespace-nowrap"
                      >
                        Copiar Código
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (selectedLead) {
                          const code = getLeadExportCode(selectedLead);
                          const clientName = selectedLead.nome_cliente || 'Cliente';
                          const totalVal = selectedLead.valor_total ? formatCurrency(selectedLead.valor_total) : 'não informado';
                          const msg = `Olá! Quero compartilhar os dados de um Lead do PriceUs com você:\n\n*Cliente:* ${clientName}\n*Valor:* ${totalVal}\n\n*Código de Importação:* \`\`\`${code}\`\`\`\n\nCopie o código de importação acima, abra seu painel do PriceUs, clique em "Importar Código" e cole para carregar.`;
                          const waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
                          window.open(waUrl, '_blank');
                        }
                      }}
                      className="w-full py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      Enviar Código via WhatsApp para Parceiro
                    </button>
                  </div>
                </div>

                <div className="pt-4 flex flex-col gap-3">
                  <div className="flex gap-3">
                    {selectedLead.telefone_cliente && (
                      <button
                        onClick={() => sendWhatsAppMessage(selectedLead)}
                        className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
                      >
                        💬 Enviar WhatsApp
                      </button>
                    )}
                     {(selectedLead.status === 'convertido' || selectedLead.status === 'finalizado') && !selectedLead.avaliacao_id && selectedLead.telefone_cliente && (
                      <button
                        onClick={() => handleSolicitarAvaliacao(selectedLead)}
                        className="flex-1 bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors font-medium flex items-center justify-center gap-2"
                      >
                        <Star className="w-5 h-5" />
                        Solicitar Avaliação
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedLead(null)}
                    className="w-full bg-gray-200 dark:bg-[rgba(255,255,255,0.1)] text-gray-700 dark:text-[rgba(255,255,255,0.8)] px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-[rgba(255,255,255,0.2)] transition-colors font-medium"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Upgrade */}
      {showUpgradeModal && (
        <UpgradeLimitModal
          type="leads"
          currentLimit={planLimits.leadsLimit}
          premiumLimit="Ilimitado"
          onClose={() => setShowUpgradeModal(false)}
        />
      )}

      {/* Modal Unificado de Geração de Contrato (iniciado direto no passo 2) */}
      {contractLead && (
        <ConvertAndContractModal
          userId={userId}
          lead={contractLead}
          initialStep={2}
          onClose={() => setContractLead(null)}
          onSuccess={async () => {
            setContractLead(null);
            await loadLeads();
          }}
        />
      )}
      {/* Modal de Edição de Orçamento */}
      {editingLeadQuote.lead && editingLeadQuote.detalhes && (
        <EditLeadQuoteModal
          lead={editingLeadQuote.lead}
          savedOrcamentoDetalhe={editingLeadQuote.detalhes}
          onClose={() => setEditingLeadQuote({lead: null, detalhes: null})}
          onSave={(updatedData: Partial<Lead>) => {
             // Esconde o modal
             setEditingLeadQuote({lead: null, detalhes: null});
             // Atualiza o lead selecionado p/ UI refletir imediatamente (como o valor total e cidade)
             if (editingLeadQuote.lead && selectedLead?.id === editingLeadQuote.lead.id) {
               setSelectedLead(prev => prev ? { ...prev, ...updatedData } : prev);
             }
             // Recarrega detalhes instantaneamente na UI e o Whatsapp novo
             // passando o lead atualizado
             const locallyUpdatedLead = { ...editingLeadQuote.lead!, ...updatedData };
             loadDetalhesOrcamento(locallyUpdatedLead, true);
             // Recarrega a listagem de leads para atualizar Valor Total global
             loadLeads();
          }}
        />
      )}

      {/* Modal de Confirmação para WhatsApp */}
      {whatsappLeadConfig.isOpen && whatsappLeadConfig.lead && whatsappLeadConfig.savedOrcamentoDetalhe && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm shadow-2xl flex items-center justify-center z-[70] p-4">
          <div className="bg-white dark:bg-[#0a1628] border dark:border-[rgba(255,255,255,0.05)] rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-[rgba(34,197,94,0.2)] flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Enviar WhatsApp para {whatsappLeadConfig.lead.nome_cliente}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Selecione a abordagem ideal para abordar seu cliente.
                  </p>
                </div>
              </div>

              {/* Seletor de Tipo de Abordagem */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Tipo de Abordagem (Follow-up)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(['padrao', 'apresentacao', 'lembrete', 'desconto', 'brinde', 'urgencia'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFollowupType(type)}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                        followupType === type
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-gray-100 dark:bg-white/5 text-gray-750 dark:text-gray-300 hover:bg-gray-250 dark:hover:bg-white/10'
                      }`}
                    >
                      {type === 'padrao'
                        ? '📨 Padrão'
                        : type === 'apresentacao'
                        ? '📸 Apresentação'
                        : type === 'lembrete'
                        ? '👋 Lembrete'
                        : type === 'desconto'
                        ? '🏷️ Desconto'
                        : type === 'brinde'
                        ? '🎁 Brinde'
                        : '⚠️ Urgência'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Configurações Dinâmicas por Tipo */}
              {followupType === 'desconto' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-950 rounded-lg">
                  <div>
                    <label className="block text-xs font-semibold text-blue-900 dark:text-blue-300 mb-1">
                      Desconto (%)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={followupDiscountPercent}
                      onChange={(e) => setFollowupDiscountPercent(Math.max(1, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-1.5 border border-blue-200 dark:border-blue-900 rounded-lg bg-white dark:bg-[#07101f] text-xs text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-blue-900 dark:text-blue-300 mb-1">
                      Código do Cupom
                    </label>
                    <input
                      type="text"
                      value={followupCouponCode}
                      onChange={(e) => setFollowupCouponCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
                      className="w-full px-3 py-1.5 border border-blue-200 dark:border-blue-900 rounded-lg bg-white dark:bg-[#07101f] text-xs text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {followupType === 'brinde' && (
                <div className="p-3 bg-purple-50/50 dark:bg-purple-950/10 border border-purple-100 dark:border-purple-950 rounded-lg">
                  <label className="block text-xs font-semibold text-purple-900 dark:text-purple-300 mb-1">
                    Brinde Especial
                  </label>
                  <input
                    type="text"
                    value={followupBonusGift}
                    onChange={(e) => setFollowupBonusGift(e.target.value)}
                    placeholder="Ex: Um Ensaio de Bônus, 1 Álbum Pocket..."
                    className="w-full px-3 py-1.5 border border-purple-200 dark:border-purple-900 rounded-lg bg-white dark:bg-[#07101f] text-xs text-gray-900 dark:text-white"
                  />
                </div>
              )}

              {/* Opções de Apresentação de Valores */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-150 dark:border-white/5">
                <div>
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Ocultar preços dos itens</span>
                  <p className="text-[10px] text-gray-500">Exibe apenas o valor final do orçamento na mensagem.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={whatsappLeadConfig.savedOrcamentoDetalhe.ocultar_valores_intermediarios ?? false}
                    onChange={(e) => {
                      const updated = {
                        ...whatsappLeadConfig.savedOrcamentoDetalhe!,
                        ocultar_valores_intermediarios: e.target.checked,
                      };
                      setWhatsappLeadConfig(prev => ({
                        ...prev,
                        savedOrcamentoDetalhe: updated,
                      }));
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Prévia da Mensagem */}
              <div>
                <span className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Prévia da Mensagem (Copie ou Envie)
                </span>
                <div className="p-3 bg-gray-50 dark:bg-black/25 border border-gray-150 dark:border-white/5 rounded-lg max-h-48 overflow-y-auto">
                  <pre className="text-xs font-sans whitespace-pre-wrap text-gray-800 dark:text-gray-300">
                    {whatsappMessageBody || 'Gerando mensagem...'}
                  </pre>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-[#07101f] px-6 py-4 flex justify-between items-center border-t dark:border-white/5">
              <button
                type="button"
                onClick={() => setWhatsappLeadConfig({ lead: null, savedOrcamentoDetalhe: null, isOpen: false })}
                className="text-gray-500 hover:text-gray-700 dark:text-[rgba(255,255,255,0.6)] dark:hover:text-white text-xs font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => executeWhatsAppMessage(
                  whatsappLeadConfig.lead!,
                  whatsappLeadConfig.savedOrcamentoDetalhe!,
                  whatsappLeadConfig.savedOrcamentoDetalhe!.ocultar_valores_intermediarios || false,
                  {
                    type: followupType,
                    discountPercent: followupDiscountPercent,
                    couponCode: followupCouponCode,
                    bonusGift: followupBonusGift
                  }
                )}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
              >
                <MessageCircle className="w-4 h-4" />
                Enviar via WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Safari Fallback Modal */}
      {safariFallback.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm shadow-2xl z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0a1628] rounded-xl border dark:border-[rgba(255,255,255,0.05)] shadow-xl max-w-md w-full p-6 animate-fade-in text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-[rgba(34,197,94,0.2)] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Orçamento Gerado!</h3>
            <p className="text-gray-600 dark:text-[rgba(255,255,255,0.6)] mb-6 text-sm">
              Mensagem para <strong className="text-gray-900 dark:text-white">{safariFallback.nomeCliente}</strong> pronta para envio. Devido a limitações do iOS, clique no botão abaixo para abrir o WhatsApp de forma segura.
            </p>
            
            <div className="space-y-3">
              <a 
                href={safariFallback.waLink} 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={() => setSafariFallback({ isOpen: false, waLink: '', nomeCliente: '' })}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#25D366] text-white rounded-lg hover:bg-[#128C7E] font-medium transition-colors shadow-lg cursor-pointer text-lg"
              >
                Abrir WhatsApp Agora
              </a>
              
              <button 
                onClick={() => setSafariFallback({ isOpen: false, waLink: '', nomeCliente: '' })}
                className="w-full px-4 py-2 text-gray-500 hover:text-gray-800 dark:text-[rgba(255,255,255,0.6)] dark:hover:text-white font-medium cursor-pointer"
              >
                Cancelar Envio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmação Exclusão Única */}
      {deleteConfirmSingle && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <div className="bg-white dark:bg-[#0a1628] rounded-xl border dark:border-[rgba(255,255,255,0.05)] shadow-xl w-full max-w-md overflow-hidden p-6 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-[rgba(239,68,68,0.2)] mb-4">
              <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Excluir Lead</h3>
            <p className="text-gray-600 dark:text-[rgba(255,255,255,0.6)] mb-6 font-medium">Tem certeza que deseja excluir este lead permanentemente? Essa ação não pode ser desfeita.</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setDeleteConfirmSingle(null)}
                disabled={deletingIds.has(deleteConfirmSingle)}
                className="px-5 py-2.5 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[rgba(255,255,255,0.05)] hover:bg-gray-200 dark:hover:bg-[rgba(255,255,255,0.1)] rounded-lg font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteLead(deleteConfirmSingle)}
                disabled={deletingIds.has(deleteConfirmSingle)}
                className="px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                {deletingIds.has(deleteConfirmSingle) ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmação Exclusão Múltipla */}
      {deleteConfirmMultiple && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <div className="bg-white dark:bg-[#0a1628] rounded-xl border dark:border-[rgba(255,255,255,0.05)] shadow-xl w-full max-w-md overflow-hidden p-6 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-[rgba(239,68,68,0.2)] mb-4">
              <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Excluir {selectedIds.length} Leads</h3>
            <p className="text-gray-600 dark:text-[rgba(255,255,255,0.6)] mb-6 font-medium">Tem certeza que deseja excluir esses leads permanentemente? Essa ação não pode ser desfeita.</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setDeleteConfirmMultiple(false)}
                disabled={isDeleting}
                className="px-5 py-2.5 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[rgba(255,255,255,0.05)] hover:bg-gray-200 dark:hover:bg-[rgba(255,255,255,0.1)] rounded-lg font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteSelected}
                disabled={isDeleting}
                className="px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                {isDeleting ? 'Excluindo...' : 'Sim, Excluir Todos'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Unificado de Conversão e Contrato */}
      {convertModal && (
        <ConvertAndContractModal
          userId={userId}
          lead={{...convertModal.lead, orcamento_detalhe: convertModal.orcamentoDetalhe || convertModal.lead.orcamento_detalhe}}
          initialStep={1}
          onClose={() => {
            const closedLead = convertModal.lead;
            setConvertModal(null);
            // Reabre o resumo
            setSelectedLead(closedLead);
          }}
          onSuccess={() => {
            setConvertModal(null);
            setMainTab('producao');
            loadLeads();
          }}
        />
      )}

      {/* Modal de Cancelamento de Conversão */}
      {cancelConversionConfig && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0a1628] rounded-2xl shadow-2xl w-full max-w-md border dark:border-[rgba(255,255,255,0.06)] overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4 text-red-600 dark:text-red-400">
                <AlertTriangle className="w-8 h-8" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Desfazer Conversão do Lead?</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                Você está alterando o status de <strong>{cancelConversionConfig.leadName}</strong> para fora de "Convertido/Finalizado".
                Isso irá limpar automaticamente todas as informações de produção criadas:
              </p>
              <ul className="space-y-2 text-xs text-gray-500 dark:text-gray-400 mb-6 bg-gray-50 dark:bg-white/5 p-3 rounded-lg border dark:border-white/5">
                <li className="flex items-center gap-2">❌ Lançamentos e parcelas de receitas financeiras.</li>
                <li className="flex items-center gap-2">❌ Eventos vinculados a este lead na agenda (inclusive Google Calendar).</li>
                <li className="flex items-center gap-2">❌ Contratos gerados para este lead.</li>
              </ul>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCancelConversionConfig(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/5 rounded-xl hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  disabled={isCancelingConversion}
                  onClick={() => executeCancelConversion(cancelConversionConfig.leadId, cancelConversionConfig.newStatus)}
                  className="px-4 py-2 text-sm font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isCancelingConversion && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirmar e Desfazer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cadastro Manual de Lead */}
      {showNewLeadModal && (
        <NewLeadModal
          userId={userId}
          onClose={() => setShowNewLeadModal(false)}
          onSuccess={async () => {
            setShowNewLeadModal(false);
            await loadLeads();
          }}
        />
      )}
      
      {/* Modal de Importação de Lead Compartilhado */}
      {importingLeadData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-fade-in">
          <div className="bg-white dark:bg-[#0a1628] border dark:border-[rgba(255,255,255,.08)] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-left">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mx-auto">
              <ClipboardList className="w-6 h-6" />
            </div>
            
            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Importar Lead Compartilhado</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Você recebeu dados de um cliente compartilhado por <strong>{importingLeadData.shared_by}</strong>.
              </p>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-[#07101f] rounded-xl border dark:border-[rgba(255,255,255,.05)] text-sm space-y-2">
              <div>
                <span className="text-gray-400 text-xs uppercase block font-semibold">Cliente</span>
                <span className="text-gray-800 dark:text-white font-medium">{importingLeadData.nome_cliente}</span>
              </div>
              {importingLeadData.telefone_cliente && (
                <div>
                  <span className="text-gray-400 text-xs uppercase block font-semibold">WhatsApp</span>
                  <span className="text-gray-800 dark:text-white font-medium">{importingLeadData.telefone_cliente}</span>
                </div>
              )}
              {importingLeadData.valor_total > 0 && (
                <div>
                  <span className="text-gray-400 text-xs uppercase block font-semibold">Valor Estimado</span>
                  <span className="text-green-600 dark:text-green-400 font-bold">{formatCurrency(importingLeadData.valor_total)}</span>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setImportingLeadData(null)}
                className="flex-1 px-4 py-2 bg-gray-150 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-semibold transition-colors"
              >
                Ignorar
              </button>
              <button
                type="button"
                onClick={handleExecuteImportLead}
                disabled={isImporting}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                {isImporting ? 'Importando...' : 'Importar Lead'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Importação Manual de Lead via Código */}
      {showImportJsonModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-fade-in">
          <div className="bg-white dark:bg-[#0a1628] border dark:border-[rgba(255,255,255,.08)] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-left">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            
            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Importar Lead via Código</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Cole o código do lead que você copiou do seu parceiro para importá-lo instantaneamente para a sua conta.
              </p>
            </div>

            <textarea
              rows={6}
              value={jsonImportText}
              onChange={(e) => setJsonImportText(e.target.value)}
              placeholder='Cole o código do lead aqui...'
              className="w-full p-3 border border-gray-350 dark:border-gray-700 rounded-xl bg-white dark:bg-[#07101f] text-xs font-mono text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowImportJsonModal(false);
                  setJsonImportText('');
                }}
                className="flex-1 px-4 py-2 bg-gray-150 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!jsonImportText.trim()) {
                    alert('⚠️ Por favor, cole o código do lead.');
                    return;
                  }
                  setIsImportingJson(true);
                  try {
                    let rawText = jsonImportText.trim();
                    if (!rawText.startsWith('{') && !rawText.startsWith('[')) {
                      try {
                        rawText = decodeURIComponent(escape(atob(rawText)));
                      } catch (e) {
                        console.warn('Falha ao decodificar Base64, tentando parse direto:', e);
                      }
                    }
                    const parsedData = JSON.parse(rawText);
                    if (!parsedData || !parsedData.nome_cliente) {
                      throw new Error('Formato do lead inválido. O campo "nome_cliente" é obrigatório.');
                    }
                    
                    // Associa o lead importado ao primeiro template do próprio usuário para que ele possa gerenciar no painel dele
                    const firstTemplateId = Object.keys(templates)[0] || '';

                    const newLead = {
                      user_id: userId,
                      template_id: firstTemplateId || parsedData.template_id,
                      nome_cliente: parsedData.nome_cliente,
                      email_cliente: parsedData.email_cliente,
                      telefone_cliente: parsedData.telefone_cliente,
                      valor_total: parsedData.valor_total,
                      dados_formulario: parsedData.dados_formulario,
                      orcamento_detalhe: parsedData.orcamento_detalhe,
                      status: 'novo',
                      data_evento: parsedData.data_evento,
                      cidade_evento: parsedData.cidade_evento,
                      tipo_evento: parsedData.tipo_evento,
                    };

                    const { error } = await supabase
                      .from('leads')
                      .insert([newLead]);

                    if (error) throw error;

                    alert(`✅ Lead importado com sucesso!`);
                    setShowImportJsonModal(false);
                    setJsonImportText('');
                    loadLeads();
                  } catch (err: any) {
                    console.error('Erro ao importar código:', err);
                    const errMsg = err?.message || err?.details || JSON.stringify(err) || 'Verifique se o código foi copiado corretamente.';
                    alert(`❌ Não foi possível importar o lead.\n\n${errMsg}`);
                  } finally {
                    setIsImportingJson(false);
                  }
                }}
                disabled={isImportingJson}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                {isImportingJson ? 'Importando...' : 'Confirmar Importação'}
              </button>
            </div>
          </div>
        </div>
      )}
      </>
      )}

    </div>
  );
}

// ============================================================
// SUB-COMPONENTE: ABA CLIENTES / PRODUÇÃO
// ============================================================
interface ProducaoTabProps {
  leads: any[];
  userId: string;
  templates: Record<string, any>;
  formatCurrency: (v: number) => string;
  formatDate: (v: string) => string;
  onWorkflowChange: (leadId: string, workflow: any[]) => void;
  onLeadFinalizado: (lead: any) => void;
  onSolicitarAvaliacao?: (lead: any) => void;
}

const ProducaoTab = React.memo(function ProducaoTab({
  leads,
  userId,
  templates,
  formatCurrency,
  formatDate,
  onWorkflowChange,
  onLeadFinalizado,
  onSolicitarAvaliacao: _onSolicitarAvaliacao = undefined,
}: ProducaoTabProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc'); // asc = mais próximo primeiro, desc = mais distante primeiro

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
          <Clapperboard className="w-8 h-8 text-purple-500" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-white">Nenhum cliente em produção</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Leads convertidos aparecem aqui para você gerenciar o workflow de produção.
          </p>
        </div>
      </div>
    );
  }

  // Ordena os leads por data do evento
  const sortedLeads = [...leads].sort((a, b) => {
    if (!a.data_evento && !b.data_evento) return 0;
    if (!a.data_evento) return 1;
    if (!b.data_evento) return -1;
    const dateA = new Date(a.data_evento).getTime();
    const dateB = new Date(b.data_evento).getTime();
    return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between bg-white dark:bg-[#0a1628] p-3 rounded-xl border border-gray-200 dark:border-white/[0.07] shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Ordenar por data:</span>
          <button 
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-white/[0.05] text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-white/[0.1] transition-colors"
          >
            {sortOrder === 'asc' ? <ArrowDownWideNarrow className="w-4 h-4" /> : <ArrowUpNarrowWide className="w-4 h-4" />}
            {sortOrder === 'asc' ? 'Mais Próximo' : 'Mais Distante'}
          </button>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#07101f] p-1 rounded-lg">
          <button 
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-[#1a2b42] text-purple-600 dark:text-purple-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-[#1a2b42] text-purple-600 dark:text-purple-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "flex flex-col gap-4"}>
        {sortedLeads.map((lead) => (
        <ProducaoCard
          key={lead.id}
          lead={lead}
          userId={userId}
          templateName={templates[lead.template_id]?.nome_template || ''}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          onWorkflowChange={onWorkflowChange}
          onLeadFinalizado={onLeadFinalizado}
        />
      ))}
      </div>
    </div>
  );
});

// ── Card individual de Produção ───────────────────────────
interface ProducaoCardProps {
  lead: any;
  userId: string;
  templateName: string;
  formatCurrency: (v: number) => string;
  formatDate: (v: string) => string;
  onWorkflowChange: (leadId: string, workflow: any[]) => void;
  onLeadFinalizado: (lead: any) => void;
}

function ProducaoCard({
  lead,
  userId,
  templateName,
  formatCurrency,
  formatDate,
  onWorkflowChange,
  onLeadFinalizado,
}: ProducaoCardProps) {
  const workflow: WorkflowStep[] = Array.isArray(lead.workflow) ? lead.workflow : [];

  const whatsappLink = lead.telefone_cliente
    ? (() => {
        const cleaned = lead.telefone_cliente.replace(/\D/g, '');
        return `https://wa.me/${(cleaned.length === 10 || cleaned.length === 11) && !cleaned.startsWith('55') ? '55' + cleaned : cleaned}`;
      })()
    : null;
  const emailLink = lead.email_cliente ? `mailto:${lead.email_cliente}` : null;

  return (
    <div className="bg-white dark:bg-[#0a1628] rounded-xl border border-gray-200 dark:border-white/[0.07] shadow-sm hover:shadow-md dark:hover:shadow-none transition-shadow overflow-hidden">
      {/* Cabeçalho do card */}
      <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-gray-900 dark:text-white text-base truncate">
              {lead.nome_cliente || 'Cliente sem nome'}
            </h3>
            <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-semibold rounded-full">
              Em Produção
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-gray-500 dark:text-gray-400">
            {templateName && <span>📋 {templateName}</span>}
            {lead.data_evento && <span>📅 {formatDate(lead.data_evento)}</span>}
            {lead.tipo_evento && <span>🎬 {lead.tipo_evento}</span>}
            <span className="font-semibold text-gray-700 dark:text-gray-200">
              {formatCurrency(lead.valor_total)}
            </span>
          </div>
        </div>

        {/* Ações de contato */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {whatsappLink && (
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              title="Contato WhatsApp"
              className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
            </a>
          )}
          {emailLink && (
            <a
              href={emailLink}
              title="Enviar e-mail"
              className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
            >
              <Mail className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      {/* WorkflowStepper */}
      <div className="px-5 pb-4">
        <WorkflowStepper
          leadId={lead.id}
          leadName={lead.nome_cliente || 'Cliente'}
          userId={userId}
          initialWorkflow={workflow}
          onWorkflowChange={(updated) => onWorkflowChange(lead.id, updated)}
          onAllCompleted={() => onLeadFinalizado(lead)}
          leadProdutos={lead.orcamento_detalhe?.produtos || []}
        />
      </div>
    </div>
  );
}

// ============================================================
// SUB-COMPONENTE: ABA FINALIZADOS
// ============================================================
interface FinalizadosTabProps {
  leads: any[];
  userId: string;
  templates: Record<string, any>;
  formatCurrency: (v: number) => string;
  formatDate: (v: string) => string;
  onSolicitarAvaliacao: (lead: any) => void;
  onReativar: (lead: any) => void;
}

const FinalizadosTab = React.memo(function FinalizadosTab({
  leads,
  templates,
  formatCurrency,
  formatDate,
  onSolicitarAvaliacao,
  onReativar,
}: FinalizadosTabProps) {
  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-green-500" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-white">Nenhum projeto finalizado</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Projetos concluídos aparecem aqui. Complete todas as etapas do workflow para mover um cliente.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header informativo */}
      <div className="flex items-center gap-2 px-1">
        <CheckCircle2 className="w-4 h-4 text-green-500" />
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {leads.length} projeto{leads.length !== 1 ? 's' : ''} finalizado{leads.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {leads.map((lead) => {
          const whatsappLink = lead.telefone_cliente
            ? (() => {
                const cleaned = lead.telefone_cliente.replace(/\D/g, '');
                return `https://wa.me/${(cleaned.length === 10 || cleaned.length === 11) && !cleaned.startsWith('55') ? '55' + cleaned : cleaned}`;
              })()
            : null;
          const emailLink = lead.email_cliente ? `mailto:${lead.email_cliente}` : null;
          const templateName = templates[lead.template_id]?.nome_template || '';

          return (
            <div
              key={lead.id}
              className="bg-white dark:bg-[#0a1628] rounded-xl border border-green-200 dark:border-green-900/50 shadow-sm overflow-hidden"
            >
              {/* Barra verde de status */}
              <div className="h-1 bg-gradient-to-r from-green-400 to-emerald-500" />

              <div className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-gray-900 dark:text-white text-base">
                        {lead.nome_cliente || 'Cliente'}
                      </h3>
                      <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-semibold rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Finalizado
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {templateName && <span>📋 {templateName}</span>}
                      {lead.data_evento && <span>📅 {formatDate(lead.data_evento)}</span>}
                      <span className="font-semibold text-gray-700 dark:text-gray-200">
                        {formatCurrency(lead.valor_total)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ações de pós-venda — destaque */}
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/[0.05]">
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">
                    Ações de Pós-Venda
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {whatsappLink && (
                      <a
                        href={whatsappLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-[#25D366] hover:bg-[#128C7E] text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
                      >
                        <MessageCircle className="w-4 h-4" />
                        WhatsApp
                      </a>
                    )}
                    {emailLink && (
                      <a
                        href={emailLink}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
                      >
                        <Mail className="w-4 h-4" />
                        E-mail
                      </a>
                    )}
                    {lead.telefone_cliente && (
                      <button
                        onClick={() => onSolicitarAvaliacao(lead)}
                        className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
                      >
                        <Star className="w-4 h-4" />
                        Pedir Avaliação
                      </button>
                    )}
                    <button
                      onClick={() => onReativar(lead)}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors"
                      title="Mover de volta para produção"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Reativar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
