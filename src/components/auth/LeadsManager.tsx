import React, { useState, useEffect, useMemo } from 'react';
import { supabase, Lead, LeadStatus } from '../../lib/supabase'; // Importando LeadStatus para tipagem
import { formatCurrency, formatDate, formatDateTime } from '../../lib/utils';
import { Trash2, Crown, AlertTriangle, TrendingUp, FileSignature, Star, CheckSquare, Search, Edit, ChevronDown, Loader2 } from 'lucide-react';
import { usePlanLimits } from '../../hooks/usePlanLimits';
import { UpgradeLimitModal } from '../../components/UpgradeLimitModal';
import { generateWhatsAppMessage, generateWaLinkToClient, PaymentMethod } from '../../lib/whatsappMessageGenerator';
import { ContractGenerator } from '../../components/ContractGenerator';
import { Product, CustomField, PriceBreakdown } from '../../lib/whatsappMessageGenerator'; // Importar interfaces necessárias
import { checkAvailability, AvailabilityResult } from '../../services/availabilityService';
import { useReviewRequest } from '../../hooks/useReviewRequest';

// Define interfaces for better type safety
interface ProductDetail {
  id: string;
  nome: string;
  valor: number;
  quantidade: number;
}

interface CustomFieldDetail {
  label: string;
  valor: string;
}

// New interface to match what's saved in lead.orcamento_detalhe by QuotePage
interface LeadOrcamentoDetalhe {
  selectedProdutos: Record<string, number>; // { productId: quantity }
  selectedFormaPagamento?: string; // ID da forma de pagamento
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

interface OrcamentoDetalhado {
  produtos: ProductDetail[];
  formaPagamento?: PaymentMethod; // Use the imported PaymentMethod interface
  camposPersonalizados: CustomFieldDetail[];
}

interface LeadWithReview extends Lead {
  avaliacao_id?: string | null;
}

export function LeadsManager({ userId }: { userId: string }) {
  const [leads, setLeads] = useState<LeadWithReview[]>([]);
  const [contracts, setContracts] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'novo' | 'contatado' | 'convertido' | 'perdido' | 'abandonado' | 'em negociação' | 'fazer_followup'>('all');
  const [selectedLead, setSelectedLead] = useState<LeadWithReview | null>(null);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [templates, setTemplates] = useState<Record<string, TemplateFromDB>>({});
  const [cities, setCities] = useState<Record<string, City>>({});
  const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(false);
  const [contractLead, setContractLead] = useState<Lead | null>(null);
  const [detalhesOrcamento, setDetalhesOrcamento] = useState<LeadOrcamentoDetalhe | null>(null);
  const [loadingDetalhes, setLoadingDetalhes] = useState(false);
  const [whatsappMessageBody, setWhatsappMessageBody] = useState<string>('');
  const [disponibilidadeLead, setDisponibilidadeLead] = useState<AvailabilityResult | null>(null);

  const planLimits = usePlanLimits(); // useMemo was removed from import, but usePlanLimits is used
  const { solicitarAvaliacao } = useReviewRequest();

  const filteredLeads = useMemo(() => {
    let leadsToFilter = leads;
    if (filter !== 'all') {
      leadsToFilter = leads.filter(l => l.status === filter);
    }
    if (!searchTerm) return leadsToFilter;
    return leadsToFilter.filter(lead => lead.nome_cliente?.toLowerCase().includes(searchTerm.toLowerCase()) || lead.email_cliente?.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [leads, filter, searchTerm]);

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

    if (updateState) {
      setDetalhesOrcamento(savedOrcamentoDetalhe);
      setLoadingDetalhes(false);
      // Agora, geramos a prévia da mensagem do WhatsApp
      generateAndSetWhatsappMessage(lead, savedOrcamentoDetalhe, true);
    }

    return savedOrcamentoDetalhe;
  };

  // Função para gerar e armazenar o corpo da mensagem do WhatsApp
  const generateAndSetWhatsappMessage = async (lead: Lead, savedOrcamentoDetalhe: LeadOrcamentoDetalhe, updateState: boolean): Promise<string> => {
    const template: TemplateFromDB = templates[lead.template_id];
    const { data: profile } = await supabase
      .from('profiles')
      .select('nome_profissional, email_recebimento, whatsapp_principal')
      .eq('id', userId)
      .single();

    // Reconstruct selected products with quantities for display in modal
    const produtosDetalhes: ProductDetail[] = Object.keys(savedOrcamentoDetalhe.selectedProdutos || {})
      .map(productId => {
        const productInfo = savedOrcamentoDetalhe.produtos?.find(p => p.id === productId);
        if (productInfo) {
          return {
            id: productId,
            nome: productInfo.nome,
            valor: productInfo.valor,
            quantidade: savedOrcamentoDetalhe.selectedProdutos[productId],
          };
        }
        return null;
      })
      .filter(Boolean) as ProductDetail[];

    const cityName = cities[lead.cidade_evento || '']?.nome || lead.cidade_evento;

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
        taxaDeslocamento: 0,
        ajusteGeografico: { percentual: 0, taxa: 0 },
        descontoCupom: 0,
        acrescimoFormaPagamento: 0,
        total: lead.valor_total,
      },
      eventDate: lead.data_evento || undefined,
      eventCity: cityName, 
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
  const loadLeads = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('leads')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      const netError = error as Error;
      console.error('Erro ao carregar leads:', netError);
      // Adicionando um alerta para o usuário sobre a falha de rede.
      alert(`Falha ao carregar os leads. Verifique sua conexão com a internet. Detalhe: ${netError.message}`);
    } finally {
      setLoading(false);
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
              valor: lead.orcamento_detalhe?.priceBreakdown?.total ?? lead.valor_total,
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

      // 2. Gerar a mensagem com os detalhes carregados
      const disponibilidade = lead.data_evento ? await checkAvailability(userId, lead.data_evento) : null;
      const mensagem = await generateAndSetWhatsappMessage(lead, savedOrcamentoDetalhe, false);

      // 🔥 GERAR LINK WA.ME
      const waLink = generateWaLinkToClient(lead.telefone_cliente, mensagem);
      window.open(waLink, '_blank'); // Usar window.open para compatibilidade

      updateLeadStatus(lead.id, 'contatado');
    } catch (error) {
      console.error("Erro ao gerar mensagem do WhatsApp:", error);
      alert("❌ Ocorreu um erro ao tentar gerar a mensagem. Verifique os dados do lead e tente novamente.");
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
      window.open(result.token, '_blank');
      alert('✅ Link de avaliação gerado! A mensagem será aberta no WhatsApp.');
      loadLeads();
    } else {
      alert(`❌ ${result.error || 'Erro ao solicitar avaliação'}`);
    }
  };

  const deleteLead = async (leadId: string) => {
    if (!confirm('⚠️ Tem certeza que deseja excluir este lead permanentemente? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId);

      if (error) throw error;

      alert('✅ Lead excluído com sucesso!');
      await loadLeads();
    } catch (error) {
      console.error('Erro ao excluir lead:', error);
      alert('❌ Erro ao excluir lead');
    }
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedLeadIds(filteredLeads.map(lead => lead.id));
    } else {
      setSelectedLeadIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedLeadIds(prev =>
      prev.includes(id) ? prev.filter(selectedId => selectedId !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedLeadIds.length === 0) return;
    const confirmed = window.confirm(`Tem certeza que deseja excluir ${selectedLeadIds.length} lead(s)? Esta ação não pode ser desfeita.`);

    if (confirmed) {
      setIsProcessing(true);
      const { error } = await supabase.from('leads').delete().in('id', selectedLeadIds);
      if (error) {
        console.error("Erro ao excluir leads:", error);
        alert("Ocorreu um erro ao excluir os leads.");
      } else {
        await loadLeads();
        setSelectedLeadIds([]);
      }
      setIsProcessing(false);
    }
  };

  const handleUpdateStatusSelected = async (newStatus: Lead['status']) => {
    if (selectedLeadIds.length === 0) return;
    const confirmed = window.confirm(`Tem certeza que deseja alterar o status de ${selectedLeadIds.length} lead(s) para "${newStatus}"?`);

    if (confirmed) {
      setIsProcessing(true);
      const { error } = await supabase.from('leads').update({ status: newStatus }).in('id', selectedLeadIds);
      if (error) {
        console.error("Erro ao atualizar status:", error);
        alert("Ocorreu um erro ao atualizar o status dos leads.");
      } else {
        await loadLeads();
        setSelectedLeadIds([]);
      }
      setIsProcessing(false);
    }
  };

  const isAllFilteredSelected = useMemo(() => {
    return filteredLeads.length > 0 && selectedLeadIds.length === filteredLeads.length && filteredLeads.every(fl => selectedLeadIds.includes(fl.id));
  }, [selectedLeadIds, filteredLeads]);

  const getStatusBadge = (status: Lead['status']) => {
    const badges: Record<string, string> = {
      novo: 'bg-blue-100 text-blue-800',
      contatado: 'bg-yellow-100 text-yellow-800',
      convertido: 'bg-green-100 text-green-800',
      perdido: 'bg-red-100 text-red-800',
      abandonado: 'bg-gray-100 text-gray-800',
      'em negociação': 'bg-purple-100 text-purple-800',
      fazer_followup: 'bg-orange-100 text-orange-800',
    };
    const labels: Record<string, string> = {
      novo: '🆕 Novo',
      contatado: '💬 Contatado',
      convertido: '✅ Convertido',
      perdido: '❌ Perdido',
      abandonado: '⏸️ Abandonado',
      'em negociação': '🤝 Em Negociação',
      fazer_followup: '📞 Fazer Follow-up',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const stats = React.useMemo(() => ({
    total: filteredLeads.length,
    novos: filteredLeads.filter((l: LeadWithReview) => l.status === 'novo').length,
    abandonados: filteredLeads.filter((l: LeadWithReview) => l.status === 'abandonado').length,
    convertidos: filteredLeads.filter((l: LeadWithReview) => l.status === 'convertido').length,
    taxaConversao: filteredLeads.length > 0
      ? ((filteredLeads.filter((l: LeadWithReview) => l.status === 'convertido').length / filteredLeads.length) * 100).toFixed(1)
      : '0.0',
  }), [leads]);

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

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Todos ({leads.length})
        </button>
        {(['novo', 'abandonado', 'contatado', 'em negociação', 'fazer_followup', 'convertido', 'perdido'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status === 'em negociação' ? 'Em Negociação' : status === 'fazer_followup' ? 'Follow-up' : status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Lista de Leads */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou e-mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {selectedLeadIds.length > 0 && (
          <div className="bg-gray-100 p-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-4">
            <span className="text-sm font-medium text-gray-700">
              {selectedLeadIds.length} selecionado(s)
            </span>
            <div className="flex items-center gap-2">
              <div className="relative group">
                <button disabled={isProcessing} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-semibold disabled:bg-blue-300">
                  <Edit className="w-4 h-4" />
                  Mudar Status
                  <ChevronDown className="w-4 h-4" />
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border z-10 hidden group-hover:block">
                  {(['novo', 'contatado', 'em negociação', 'fazer_followup', 'convertido', 'perdido', 'abandonado'] as const).map(status => (
                    <a key={status} href="#" onClick={(e) => { e.preventDefault(); handleUpdateStatusSelected(status); }} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 capitalize">{status}</a>
                  ))}
                </div>
              </div>
              <button onClick={handleDeleteSelected} disabled={isProcessing} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-semibold disabled:bg-red-300">
                <Trash2 className="w-4 h-4" />
                Excluir
              </button>
            </div>
          </div>
        )}

        {filteredLeads.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Nenhum lead encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-4">
                    <input type="checkbox" onChange={handleSelectAll} checked={isAllFilteredSelected} disabled={loading || filteredLeads.length === 0} className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500" />
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
                {filteredLeads.map((lead: LeadWithReview) => (
                  <tr key={lead.id} className={`hover:bg-gray-50 ${selectedLeadIds.includes(lead.id) ? 'bg-blue-50' : ''}`}>
                    <td className="p-4">
                      <input type="checkbox" checked={selectedLeadIds.includes(lead.id)} onChange={() => handleSelectOne(lead.id)} className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {lead.nome_cliente || 'Não informado'}
                      </div>
                      {contracts[lead.id] && (
                        <CheckSquare className="w-4 h-4 text-purple-600 ml-2" title="Contrato gerado para este lead" />
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{lead.telefone_cliente || '—'}</div>
                      <div className="text-sm text-gray-500">{lead.email_cliente || '—'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {templates[lead.template_id]?.nome_template || 'Template não encontrado'}
                        </span>
                        {/* Botão para editar o template diretamente */}
                        <a
                          href={`/dashboard?page=templates&edit=${lead.template_id}`}
                          className="text-blue-500 hover:text-blue-700"
                          title="Editar este template"
                          onClick={(e) => e.stopPropagation()} // Evita que o clique se propague para a linha
                        >
                          <Edit className="w-3 h-3" />
                        </a>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
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
                        onClick={() => {
                          // Garante que o lead tenha um nome de cliente antes de abrir o gerador de contrato
                          if (lead.nome_cliente) {
                            setContractLead(lead);
                          }
                        }}
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
                        onClick={() => deleteLead(lead.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Excluir lead"
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
                    <p><strong>Tipo:</strong> {selectedLead.tipo_evento || '—'}</p>
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
                  <div className="mt-2">
                    <p><strong>Valor Total:</strong> {formatCurrency(selectedLead.valor_total)}</p>
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
                    {(['novo', 'contatado', 'em negociação', 'fazer_followup', 'convertido', 'perdido', 'abandonado'] as const).map((status: Lead['status']) => (
                      <button
                        key={status}
                        onClick={() => updateLeadStatus(selectedLead.id, status)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium ${
                          selectedLead.status === status
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {status === 'em negociação' ? '🤝 Em Negociação' : status === 'fazer_followup' ? '📞 Follow-up' : status.charAt(0).toUpperCase() + status.slice(1)}
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
    </div>
  );
}
