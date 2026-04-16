import React, { useState, useEffect, useMemo } from 'react'; // Re-confirmando importação explícita de React
import { EditLeadQuoteModal } from './EditLeadQuoteModal';
import { supabase, Lead } from '../lib/supabase'; // Importando Lead para tipagem
import { formatCurrency, formatDate, formatDateTime } from '../lib/utils';
import { Trash2, Crown, AlertTriangle, TrendingUp, FileSignature, Star, CheckSquare, Edit3 } from 'lucide-react';
import { usePlanLimits } from '../hooks/usePlanLimits';
import { UpgradeLimitModal } from './UpgradeLimitModal';
import { generateWhatsAppMessage, generateWaLinkToClient, PaymentMethod } from '../lib/whatsappMessageGenerator';
import { ContractGenerator } from './ContractGenerator';
import { Product, CustomField, PriceBreakdown } from '../lib/whatsappMessageGenerator'; // Importar interfaces necessárias
import { checkAvailability, AvailabilityResult } from '../services/availabilityService';
import { useReviewRequest } from '../hooks/useReviewRequest';

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
}



interface LeadWithReview extends Lead {
  avaliacao_id?: string | null;
}

export function LeadsManager({ userId }: { userId: string }) {
  const [leads, setLeads] = useState<LeadWithReview[]>([]);
  const [contracts, setContracts] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'novo' | 'contatado' | 'convertido' | 'perdido' | 'abandonado' | 'em_negociacao' | 'fazer_followup'>('all');
  const [filterTemplate, setFilterTemplate] = useState<string>('all');
  const [selectedLead, setSelectedLead] = useState<LeadWithReview | null>(null);
  const [templates, setTemplates] = useState<Record<string, TemplateFromDB>>({});
  const [cities, setCities] = useState<Record<string, City>>({});
  const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(false);
  const [contractLead, setContractLead] = useState<Lead | null>(null);
  const [detalhesOrcamento, setDetalhesOrcamento] = useState<LeadOrcamentoDetalhe | null>(null);
  const [loadingDetalhes, setLoadingDetalhes] = useState(false);
  const [whatsappMessageBody, setWhatsappMessageBody] = useState<string>('');
  const [disponibilidadeLead, setDisponibilidadeLead] = useState<AvailabilityResult | null>(null);
  const [editingLeadQuote, setEditingLeadQuote] = useState<{lead: Lead | null, detalhes: LeadOrcamentoDetalhe | null}>({lead: null, detalhes: null});

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingIds, setDeletingIds] = useState(new Set<string>());
  const [deleteConfirmSingle, setDeleteConfirmSingle] = useState<string | null>(null);
  const [deleteConfirmMultiple, setDeleteConfirmMultiple] = useState(false);
  const planLimits = usePlanLimits(); // useMemo was removed from import, but usePlanLimits is used
  const { solicitarAvaliacao } = useReviewRequest();

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
    } else {
      setWhatsappMessageBody(''); // Limpa a mensagem anterior
      setDetalhesOrcamento(null);
      setDisponibilidadeLead(null);
    }
  }, [selectedLead]);

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
      if (fetchProdutos) {
        produtosCompletos = fetchProdutos;
        produtosRaw.forEach((p: any) => {
          selectedProdutosDict[p.produto_id || p.id] = p.quantidade;
        });
      }
    } else if (savedOrcamentoDetalhe.selectedProdutos) {
      Object.assign(selectedProdutosDict, savedOrcamentoDetalhe.selectedProdutos);
      const ids = Object.keys(selectedProdutosDict);
      const { data: fetchProdutos } = await supabase.from('produtos').select('*').in('id', ids);
      if (fetchProdutos) {
        produtosCompletos = fetchProdutos;
      }
    } else {
      produtosCompletos = savedOrcamentoDetalhe.produtos || [];
    }

    let formaPagamentoCompleta = savedOrcamentoDetalhe.paymentMethod;
    const pagamentoId = savedOrcamentoDetalhe.selectedFormaPagamento || savedOrcamentoDetalhe.forma_pagamento_id || (savedOrcamentoDetalhe as any).selecoes?.paymentMethod;
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
      paymentMethod: formaPagamentoCompleta
    };

    if (updateState) {
      setDetalhesOrcamento(orcamentoEnriquecido);
      setLoadingDetalhes(false);
      // Agora, geramos a prévia da mensagem do WhatsApp
      generateAndSetWhatsappMessage(lead, orcamentoEnriquecido, true);
    }

    return orcamentoEnriquecido;
  };

  // Função para gerar e armazenar o corpo da mensagem do WhatsApp
  const generateAndSetWhatsappMessage = async (lead: Lead, savedOrcamentoDetalhe: LeadOrcamentoDetalhe, updateState: boolean): Promise<string> => {
    const template: TemplateFromDB = templates[lead.template_id];
    const { data: profile } = await supabase
      .from('profiles')
      .select('nome_profissional, email_recebimento, whatsapp_principal')
      .eq('id', userId)
      .single();

    const cityName = cities[lead.cidade_evento || '']?.nome || lead.cidade_evento || undefined;

    const mensagem = generateWhatsAppMessage({
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
        texto_whatsapp: template?.texto_whatsapp,
        sistema_sazonal_ativo: savedOrcamentoDetalhe.sistema_sazonal_ativo || false,
        sistema_geografico_ativo: savedOrcamentoDetalhe.sistema_geografico_ativo || false,
        ocultar_valores_intermediarios: savedOrcamentoDetalhe.ocultar_valores_intermediarios || false,
      },
      products: savedOrcamentoDetalhe.produtos || [], // Full list of products from template
      selectedProducts: savedOrcamentoDetalhe.selectedProdutos || {}, // Map of selected products
      paymentMethod: savedOrcamentoDetalhe.paymentMethod, // Full payment method object
      priceBreakdown: savedOrcamentoDetalhe.priceBreakdown || { // Use priceBreakdown from details
        subtotal: lead.valor_total,
        ajusteSazonal: 0,
        ajusteGeografico: { percentual: 0, taxa: 0 },
        descontoCupom: 0,
        acrescimoFormaPagamento: 0,
        total: lead.valor_total,
      },
      eventDate: lead.data_evento || undefined,
      eventCity: cityName || undefined, 
      availabilityStatus: disponibilidadeLead?.status, // Passa o status da disponibilidade

      customFields: savedOrcamentoDetalhe.customFields || [],
      customFieldsData: savedOrcamentoDetalhe.customFieldsData || {},
      context: 'photographer-to-client',
    });

    if (updateState) {
      setWhatsappMessageBody(mensagem);
    }

    return mensagem;
  };

  useEffect(() => {
    loadLeads();
    loadTemplates();
    loadCities();
    loadContractsForLeads();

    // Loop de atualização silenciosa a cada 60 segundos (1 min)
    const refreshInterval = setInterval(() => {
      loadLeads(true);
      loadContractsForLeads();
    }, 60000);

    const channel = supabase
      .channel('realtime-leads')
      .on<Lead>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leads',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Novo lead recebido!', payload);
          const newLead = payload.new as LeadWithReview;
          
          // Adiciona o novo lead no início da lista
          setLeads((prevLeads) => {
            if (prevLeads.some(l => l.id === newLead.id)) return prevLeads;
            return [newLead, ...prevLeads];
          });

          // NOTA: A notificação real (do banco) é criada no QuotePage e o som é gerado pelo hook useNotifications.
          // Comentado para evitar som e alerta duplicado:
          // new Audio('/notification.mp3').play().catch(() => {});
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      clearInterval(refreshInterval);
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

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('templates')
        .select('id, texto_whatsapp, nome_template, sistema_sazonal_ativo, sistema_geografico_ativo, ocultar_valores_intermediarios')
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
  };

  const loadContractsForLeads = async () => {
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
  };
  const loadLeads = async (silent: boolean = false) => {
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
  };

  const updateLeadStatus = async (leadId: string, newStatus: Lead['status']) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({
          status: newStatus,
          data_ultimo_contato: newStatus === 'contatado' ? new Date().toISOString() : null,
        })
        .eq('id', leadId);

      if (error) throw error;
      await loadLeads();
      
      if (newStatus === 'convertido') {
        const lead = leads.find((l: LeadWithReview) => l.id === leadId);
        
        // Adicionar notificação de lead convertido
        try {
          await supabase.from('notifications').insert({
            user_id: userId,
            type: 'lead_converted',
            message: `Parabéns! O lead ${lead?.nome_cliente || ''} foi convertido.`,
            link: `/dashboard/leads`,
            related_id: leadId,
          });
        } catch (notificationError) {
          console.error('Falha ao criar notificação de lead convertido:', notificationError);
        }

        // Lógica para criar transação financeira
        if (lead && lead.valor_total > 0) {
          const shouldCreateTransaction = window.confirm(
            `✅ Lead convertido! Deseja criar uma receita de ${formatCurrency(Number(lead.valor_total))} no módulo Empresa?`
          );

          if (shouldCreateTransaction) {
            await supabase.from('company_transactions').insert({
              user_id: userId,
              tipo: 'receita',
              origem: 'lead',
              descricao: `Contratação: ${lead.nome_cliente} - ${templates[lead.template_id]?.nome_template || 'Serviço'}`,
              valor: lead.valor_total,
              data: new Date().toISOString().split('T')[0],
              status: 'pendente',
              lead_id: leadId,
            });
            alert('✅ Receita criada com sucesso no módulo Empresa!');
          }
        }
      } else if (newStatus !== 'contatado') {
        alert('✅ Status atualizado com sucesso!'); // Evita alerta ao enviar WhatsApp, pois o link já é o feedback
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      alert('❌ Erro ao atualizar status');
    }
  };

  const handleDeleteSelected = async () => {
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
  };

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

  const executeWhatsAppMessage = async (lead: Lead, savedOrcamentoDetalhe: LeadOrcamentoDetalhe, ocultarExtras: boolean) => {
    try {
      if (ocultarExtras) {
        savedOrcamentoDetalhe.ocultar_valores_intermediarios = true;
      }

      await checkAvailability(userId, lead.data_evento || ''); // Só chamando p consistência (status é passado como prop?)
      const mensagem = await generateAndSetWhatsappMessage(lead, savedOrcamentoDetalhe, false);

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

  const handleSolicitarAvaliacao = async (lead: LeadWithReview) => {
    if (lead.status !== 'convertido') {
      alert('⚠️ Apenas leads convertidos podem receber solicitação de avaliação.');
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
  };

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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner de Upgrade para Plano Gratuito */}
      {!planLimits.isPremium && (
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <Crown className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">
                  Plano Gratuito: Máximo {planLimits.leadsLimit} leads
                </h3>
                <p className="text-sm text-blue-700">
                  Você tem {planLimits.leadsUsed} de {planLimits.leadsLimit} leads salvos. 
                  Quando atingir o limite, novos leads substituirão os mais antigos automaticamente.
                  Faça upgrade para leads ilimitados!
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm whitespace-nowrap"
            >
              <TrendingUp className="w-4 h-4" />
              Fazer Upgrade
            </button>
          </div>
        </div>
      )}

      {/* Aviso de Limite Próximo */}
      {!planLimits.isPremium && planLimits.leadsLimit !== 'unlimited' && planLimits.leadsUsed >= planLimits.leadsLimit * 0.8 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-900">
                {planLimits.leadsUsed >= planLimits.leadsLimit 
                  ? 'Limite de leads atingido!' 
                  : 'Você está próximo do limite de leads!'}
              </p>
              <p className="text-sm text-yellow-700 mt-1">
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
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm text-blue-600 font-medium">Total de Leads</div>
          <div className="text-2xl font-bold text-blue-900">{stats.total}</div>
          {!planLimits.isPremium && planLimits.leadsLimit !== 'unlimited' && (
            <div className={`text-xs mt-1 font-medium ${getLeadsLimitColor()}`}>
              {planLimits.leadsUsed} / {planLimits.leadsLimit} salvos
            </div>
          )}
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-sm text-yellow-600 font-medium">Novos</div>
          <div className="text-2xl font-bold text-yellow-900">{stats.novos}</div>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600 font-medium">Abandonados</div>
          <div className="text-2xl font-bold text-gray-900">{stats.abandonados}</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-sm text-green-600 font-medium">Taxa de Conversão</div>
          <div className="text-2xl font-bold text-green-900">{stats.taxaConversao}%</div>
        </div>
      </div>

      {/* ── Tabs de Template ─────────────────────────────────────── */}
      {templateTabs.length > 1 && (
        <div className="flex flex-wrap gap-2 pb-1 border-b border-gray-200">
          <button
            onClick={() => { setFilterTemplate('all'); setFilter('all'); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              filterTemplate === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Todos os Templates
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              filterTemplate === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-700'
            }`}>{leads.length}</span>
          </button>
          {templateTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setFilterTemplate(tab.id); setFilter('all'); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                filterTemplate === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.nome}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                filterTemplate === tab.id ? 'bg-indigo-500 text-white' : 'bg-gray-300 text-gray-700'
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
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
            className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-red-300"
          >
            {isDeleting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            Excluir ({selectedIds.length})
          </button>
        )}
      </div>

      {/* Lista de Leads */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {leads.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Nenhum lead encontrado para este filtro.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-4">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={selectedIds.length > 0 && selectedIds.length === filteredLeads.length}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contato
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Orçamento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Evento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leads.map((lead: LeadWithReview) => (
                  <tr key={lead.id} className={`hover:bg-gray-50 ${selectedIds.includes(lead.id) ? 'bg-blue-50' : ''}`}>
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(lead.id)}
                        onChange={() => setSelectedIds(prev => prev.includes(lead.id) ? prev.filter(id => id !== lead.id) : [...prev, lead.id])}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap flex items-center">
                      <div className="text-sm font-medium text-gray-900">
                        {lead.nome_cliente || 'Não informado'}
                      </div>
                      {contracts[lead.id] && (
                        <span title="Contrato gerado para este lead"><CheckSquare className="w-4 h-4 text-purple-600 ml-2" /></span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{lead.telefone_cliente || '—'}</div>
                      <div className="text-sm text-gray-500">{lead.email_cliente || '—'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {templates[lead.template_id]?.nome_template || 'Template não encontrado'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap"> {/* Corrigido: Removido o duplicado de data e cidade */}
                      <div className="text-sm text-gray-900">{lead.tipo_evento || '—'}</div>
                      <div className="text-sm text-gray-500">
                        {lead.data_evento ? formatDate(lead.data_evento) : '—'}
                      </div>
                      <div className="text-sm text-gray-500">{cities[lead.cidade_evento || '']?.nome || lead.cidade_evento || '—'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(lead.valor_total)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(lead.status)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="font-medium text-gray-900">{formatDate(lead.data_orcamento)}</div>
                      <div className="text-xs text-gray-500">{new Date(lead.data_orcamento).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {lead.telefone_cliente && (
                        <button
                          onClick={() => sendWhatsAppMessage(lead)}
                          className="text-green-600 hover:text-green-900"
                          title="Enviar mensagem via WhatsApp"
                        >
                          💬
                        </button>
                      )}
                      <button
                        onClick={() => setContractLead(lead)}
                        className="text-purple-600 hover:text-purple-900 disabled:text-gray-400 disabled:cursor-not-allowed"
                        title="Gerar contrato"
                        disabled={contracts[lead.id]}
                      >
                        <FileSignature className="w-4 h-4 inline" />
                      </button>
                      {lead.status === 'convertido' && lead.telefone_cliente && (
                        <button 
                          onClick={() => handleSolicitarAvaliacao(lead)}
                          className="text-yellow-600 hover:text-yellow-900"
                          title="Solicitar avaliação do cliente"
                        >
                          <Star className="w-4 h-4 inline" />
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedLead(lead)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Ver detalhes"
                      >
                        👁️
                      </button>
                      <button
                        onClick={() => setDeleteConfirmSingle(lead.id)}
                        className={`text-red-600 hover:text-red-900 ${deletingIds.has(lead.id) ? 'animate-pulse opacity-50 cursor-not-allowed' : ''}`}
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
        )}
      </div>

      {/* Modal de Detalhes */}
      {selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Detalhes do Lead</h2>
                <button
                  onClick={() => setSelectedLead(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-700">Informações do Cliente</h3>
                  <div className="mt-2 space-y-1">
                    <p><strong>Nome:</strong> {selectedLead.nome_cliente || '—'}</p>
                    <p><strong>Email:</strong> {selectedLead.email_cliente || '—'}</p>
                    <p><strong>Telefone:</strong> {selectedLead.telefone_cliente || '—'}</p>
                    <p className="text-sm text-gray-500 mt-2">
                      <strong>📅 Solicitação feita em:</strong> {formatDateTime(selectedLead.data_orcamento)}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-700">Origem do Lead</h3>
                  <div className="mt-2 space-y-1">
                    <p><strong>Orçamento:</strong> {templates[selectedLead.template_id]?.nome_template || 'Template não encontrado'}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-700">Informações do Evento</h3>
                  <div className="mt-2 space-y-1">
                    <p><strong>Tipo:</strong> {selectedLead.tipo_evento || '—'}</p> {/* Corrigido: Removido o duplicado de data e cidade */}
                    <p><strong>Data:</strong> {selectedLead.data_evento ? formatDate(selectedLead.data_evento) : '—'}
                      {disponibilidadeLead && (
                        <span className={`ml-2 text-xs font-semibold px-2 py-1 rounded-full ${disponibilidadeLead.status === 'disponivel' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{disponibilidadeLead.mensagem}</span>
                      )
                      }
                    </p>
                    <p><strong>Cidade:</strong> {cities[selectedLead.cidade_evento || '']?.nome || selectedLead.cidade_evento || '—'}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-700">Orçamento</h3>
                  <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border border-gray-200 mt-2">
                    <div>
                      <p className="text-sm text-gray-500">Valor Total Negociado</p>
                      <p className="text-xl font-bold text-blue-700">{formatCurrency(selectedLead.valor_total)}</p>
                    </div>
                    {detalhesOrcamento && !loadingDetalhes && (
                      <button
                        onClick={() => setEditingLeadQuote({lead: selectedLead, detalhes: detalhesOrcamento})}
                        className="px-4 py-2 bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 shadow-sm"
                      >
                        <Edit3 className="w-4 h-4" />
                        Editar Pacote
                      </button>
                    )}
                  </div>
                  {loadingDetalhes ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-500">Carregando detalhes do orçamento...</p>
                    </div>
                  ) : detalhesOrcamento && detalhesOrcamento.selectedProdutos && (
                    <>
                      {Object.keys(detalhesOrcamento.selectedProdutos).length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-semibold text-gray-600">Itens Selecionados:</h4>
                          <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-gray-800">
                            {(detalhesOrcamento?.produtos || [])
                              .filter(
                                p =>
                                  detalhesOrcamento?.selectedProdutos?.[p.id] > 0
                              )
                              .map(p => (
                                <li key={p.id}>{`${
                                  detalhesOrcamento.selectedProdutos[p.id]
                                }x ${p.nome} (${formatCurrency(p.valor)})`}</li>
                              ))}
                          </ul>
                        </div>
                      )}
                      {detalhesOrcamento.paymentMethod && (
                        <div className="mt-3">
                          <p className="text-sm"><strong>Forma de Pagamento:</strong> {detalhesOrcamento.paymentMethod.nome}</p>
                        </div>
                      )}
                      {detalhesOrcamento.customFields && detalhesOrcamento.customFields.length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-semibold text-gray-600">Respostas Adicionais:</h4>
                          <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-gray-800">
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
                          <h4 className="font-semibold text-gray-600">Campos Personalizados Preenchidos:</h4>
                          <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-gray-800">
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
                  <h3 className="font-semibold text-gray-700">Prévia da Mensagem de Follow-up</h3>
                  {loadingDetalhes ? (
                     <p className="text-sm text-gray-500 mt-2">Gerando prévia...</p>
                  ) : (
                    <div className="mt-2 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans">
                        {whatsappMessageBody || 'Não foi possível gerar a prévia da mensagem.'}
                      </pre>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="font-semibold text-gray-700">Atualizar Status</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(['novo', 'contatado', 'em_negociacao', 'fazer_followup', 'convertido', 'perdido', 'abandonado'] as const).map((status: Lead['status']) => (
                      <button
                        key={status}
                        onClick={() => updateLeadStatus(selectedLead.id, status)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium ${
                          selectedLead.status === status
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {status === 'em_negociacao' ? '🤝 Em Negociação' : status === 'fazer_followup' ? '📞 Follow-up' : status.charAt(0).toUpperCase() + status.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex flex-col gap-3">
                  <div className="flex gap-3">
                    {selectedLead.telefone_cliente && (
                      <button
                        onClick={() => sendWhatsAppMessage(selectedLead)}
                        className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium"
                      >
                        💬 Enviar WhatsApp
                      </button>
                    )}
                    {selectedLead.status === 'convertido' && !selectedLead.avaliacao_id && selectedLead.telefone_cliente && (
                      <button
                        onClick={() => handleSolicitarAvaliacao(selectedLead)}
                        className="flex-1 bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 font-medium flex items-center justify-center gap-2"
                      >
                        <Star className="w-5 h-5" />
                        Solicitar Avaliação
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedLead(null)}
                    className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 font-medium"
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

      {/* Modal de Geração de Contrato */}
      {contractLead && (
        <ContractGenerator
          userId={userId}
          lead={contractLead as Lead & { nome_cliente: string }}
          onClose={() => setContractLead(null)}
          onSuccess={() => loadLeads()}
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
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-fade-in">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4 mx-auto">
                <FileSignature className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-center text-gray-900 mb-2">
                Apresentação de Valores
              </h3>
              <p className="text-gray-600 text-center text-sm mb-6">
                Como você gostaria de apresentar os valores na mensagem de follow-up para o cliente?
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => executeWhatsAppMessage(whatsappLeadConfig.lead!, whatsappLeadConfig.savedOrcamentoDetalhe!, true)}
                  className="w-full relative group p-4 border-2 border-transparent bg-gradient-to-r from-blue-50 to-blue-100/50 hover:border-blue-500 rounded-xl transition-all duration-200 text-left"
                >
                  <p className="font-semibold text-blue-900 flex items-center">
                    <span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
                    Ocultar valores intermediários
                  </p>
                  <p className="text-xs text-blue-800/80 mt-1 pl-4">
                    Os produtos e eventuais taxas extras não terão seus preços listados separadamente. Apenas o valor total da proposta será exibido.
                  </p>
                </button>

                <button
                   onClick={() => executeWhatsAppMessage(whatsappLeadConfig.lead!, whatsappLeadConfig.savedOrcamentoDetalhe!, false)}
                   className="w-full relative group p-4 border-2 border-transparent bg-gradient-to-r from-gray-50 to-gray-100/50 hover:border-gray-500 rounded-xl transition-all duration-200 text-left"
                >
                  <p className="font-semibold text-gray-700 flex items-center">
                    <span className="w-2 h-2 rounded-full bg-gray-400 mr-2"></span>
                    Mostrar detalhado
                  </p>
                  <p className="text-xs text-gray-500 mt-1 pl-4">
                    Mantém transparente a listagem de preços individuais por produto/serviço e exibe eventuais custos extras do orçamento.
                  </p>
                </button>
              </div>
            </div>
            
            <div className="bg-gray-50 px-6 py-4 flex justify-end">
              <button
                onClick={() => setWhatsappLeadConfig({ lead: null, savedOrcamentoDetalhe: null, isOpen: false })}
                className="text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
               >
                Cancelar envio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Safari Fallback Modal */}
      {safariFallback.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm shadow-2xl z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-fade-in text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Orçamento Gerado!</h3>
            <p className="text-gray-600 mb-6 text-sm">
              Mensagem para <strong>{safariFallback.nomeCliente}</strong> pronta para envio. Devido a limitações do iOS, clique no botão abaixo para abrir o WhatsApp de forma segura.
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
                className="w-full px-4 py-2 text-gray-500 hover:text-gray-800 font-medium cursor-pointer"
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden p-6 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Excluir Lead</h3>
            <p className="text-gray-600 mb-6 font-medium">Tem certeza que deseja excluir este lead permanentemente? Essa ação não pode ser desfeita.</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setDeleteConfirmSingle(null)}
                disabled={deletingIds.has(deleteConfirmSingle)}
                className="px-5 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteLead(deleteConfirmSingle)}
                disabled={deletingIds.has(deleteConfirmSingle)}
                className="px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold transition-colors flex items-center gap-2"
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden p-6 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Excluir {selectedIds.length} Leads</h3>
            <p className="text-gray-600 mb-6 font-medium">Tem certeza que deseja excluir esses leads permanentemente? Essa ação não pode ser desfeita.</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setDeleteConfirmMultiple(false)}
                disabled={isDeleting}
                className="px-5 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteSelected}
                disabled={isDeleting}
                className="px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold transition-colors flex items-center gap-2"
              >
                {isDeleting ? 'Excluindo...' : 'Sim, Excluir Todos'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
