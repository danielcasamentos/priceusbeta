import { useState, useEffect } from 'react';
import { supabase, Lead } from '../lib/supabase';
import { formatCurrency, formatDate, formatDateTime } from '../lib/utils';
import { Trash2, Crown, AlertTriangle, TrendingUp } from 'lucide-react';
import { generateWhatsAppMessage, generateWaLinkToClient } from '../lib/whatsappMessageGenerator';
import { usePlanLimits } from '../hooks/usePlanLimits';
import { UpgradeLimitModal } from './UpgradeLimitModal';

export function LeadsManager({ userId }: { userId: string }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'novo' | 'contatado' | 'convertido' | 'perdido' | 'abandonado' | 'em_negociacao' | 'fazer_followup'>('all');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [templates, setTemplates] = useState<Record<string, any>>({});
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  const planLimits = usePlanLimits();

  useEffect(() => {
    loadLeads();
    loadTemplates();
  }, [userId, filter]);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('templates')
        .select('id, texto_whatsapp, nome_template')
        .eq('user_id', userId);

      if (error) throw error;

      const templatesMap: Record<string, any> = {};
      data?.forEach((template) => {
        templatesMap[template.id] = template;
      });
      setTemplates(templatesMap);
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
    }
  };

  const loadLeads = async () => {
    setLoading(true);
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
      console.error('Erro ao carregar leads:', error);
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
      alert('✅ Status atualizado com sucesso!');
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

    const template = templates[lead.template_id];

    // Buscar perfil do fotógrafo
    const { data: profile } = await supabase
      .from('profiles')
      .select('nome_profissional, email_recebimento, whatsapp_principal')
      .eq('id', userId)
      .maybeSingle();

    // Extrair produtos do orcamento
    const produtosData = lead.orcamento_detalhe?.configuracoes?.produtos || [];
    const selectedProdutos = lead.orcamento_detalhe?.selecoes?.produtos || {};

    // 🔥 USAR GERADOR ROBUSTO
    const mensagem = generateWhatsAppMessage({
      clientName: lead.nome_cliente || '',
      clientEmail: lead.email_cliente || '',
      clientPhone: lead.telefone_cliente || '',
      profile: {
        nome_profissional: profile?.nome_profissional,
        email_recebimento: profile?.email_recebimento,
        whatsapp_principal: profile?.whatsapp_principal,
      },
      template: {
        nome: template?.nome || '',
        texto_whatsapp: template?.texto_whatsapp,
        sistema_sazonal_ativo: false,
        sistema_geografico_ativo: false,
        ocultar_valores_intermediarios: false,
      },
      products: produtosData,
      selectedProducts: selectedProdutos,
      paymentMethod: undefined,
      priceBreakdown: {
        subtotal: lead.valor_total,
        ajusteSazonal: 0,
        ajusteGeografico: { percentual: 0, taxa: 0 },
        descontoCupom: 0,
        acrescimoFormaPagamento: 0,
        total: lead.valor_total,
      },
      eventDate: lead.data_evento ?? undefined,
      eventCity: lead.cidade_evento ?? undefined,
      customFields: [],
      customFieldsData: {},
      context: 'photographer-to-client',
    });

    // 🔥 GERAR LINK WA.ME
    const waLink = generateWaLinkToClient(lead.telefone_cliente, mensagem);
    window.open(waLink, '_blank');

    updateLeadStatus(lead.id, 'contatado');
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

  const getStatusBadge = (status: Lead['status']) => {
    const badges: Record<string, string> = {
      novo: 'bg-blue-100 text-blue-800',
      contatado: 'bg-yellow-100 text-yellow-800',
      convertido: 'bg-green-100 text-green-800',
      perdido: 'bg-red-100 text-red-800',
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

  const stats = {
    total: leads.length,
    novos: leads.filter((l) => l.status === 'novo').length,
    abandonados: leads.filter((l) => l.status === 'abandonado').length,
    convertidos: leads.filter((l) => l.status === 'convertido').length,
    taxaConversao: leads.length > 0
      ? ((leads.filter((l) => l.status === 'convertido').length / leads.length) * 100).toFixed(1)
      : '0.0',
  };

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
                  : `Faltam ${planLimits.leadsLimit - planLimits.leadsUsed} lead(s) para atingir o limite. Considere fazer upgrade para leads ilimitados.`}
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
          </button>
        ))}
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
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {lead.nome_cliente || 'Não informado'}
                      </div>
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{lead.tipo_evento || '—'}</div>
                      <div className="text-sm text-gray-500">
                        {lead.data_evento ? formatDate(lead.data_evento) : '—'}
                      </div>
                      <div className="text-sm text-gray-500">{lead.cidade_evento || '—'}</div>
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
                    <p><strong>Data:</strong> {selectedLead.data_evento ? formatDate(selectedLead.data_evento) : '—'}</p>
                    <p><strong>Cidade:</strong> {selectedLead.cidade_evento || '—'}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-700">Orçamento</h3>
                  <div className="mt-2">
                    <p><strong>Valor Total:</strong> {formatCurrency(selectedLead.valor_total)}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-700">Atualizar Status</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(['novo', 'contatado', 'em_negociacao', 'fazer_followup', 'convertido', 'perdido', 'abandonado'] as const).map((status) => (
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

                <div className="pt-4 flex gap-3">
                  {selectedLead.telefone_cliente && (
                    <button
                      onClick={() => sendWhatsAppMessage(selectedLead)}
                      className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium"
                    >
                      💬 Enviar WhatsApp
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedLead(null)}
                    className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 font-medium"
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
    </div>
  );
}
