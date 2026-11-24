import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BrideMarketplaceService,
  BrideProfile,
  VendorMarketplaceCard
} from '../../services/brideMarketplaceService';
import { BrideWorkspaceTabs, WorkspaceTab } from '../../components/bride/BrideWorkspaceTabs';
import { BrideExploreVendors } from '../../components/bride/BrideExploreVendors';
import { BrideVendorTabContent } from '../../components/bride/BrideVendorTabContent';
import { BrideCompareVendors } from '../../components/bride/BrideCompareVendors';
import { BrideCashFlowSimulatorModal } from '../../components/bride/BrideCashFlowSimulatorModal';
import { BrideInvestmentSummary, VendorQuoteSummary } from '../../components/bride/BrideInvestmentSummary';
import { BrideActionPlanModal, WeddingActionPlan } from '../../components/bride/BrideActionPlanModal';
import { X, Check, FileCheck, ShieldCheck, Mail, Sparkles, MessageCircle, AlertCircle } from 'lucide-react';

export function BridePortalPage() {
  const navigate = useNavigate();

  const [brideProfile, setBrideProfile] = useState<BrideProfile | null>(null);
  const [vendors, setVendors] = useState<VendorMarketplaceCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionPlan, setActionPlan] = useState<WeddingActionPlan | null>(null);
  const [isActionPlanOpen, setIsActionPlanOpen] = useState(false);

  // Sistema de Abas do Workspace (Navegador Multi-Fornecedor)
  const [tabs, setTabs] = useState<WorkspaceTab[]>([
    { id: 'explore', title: 'Explorar Fornecedores', isExplore: true },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('explore');

  // Cotações Selecionadas em tempo real pelas abas
  const [selectedQuotes, setSelectedQuotes] = useState<VendorQuoteSummary[]>([]);

  // Modais
  const [contractModalVendor, setContractModalVendor] = useState<{
    vendor: VendorMarketplaceCard;
    total: number;
  } | null>(null);
  const [contractSuccessToast, setContractSuccessToast] = useState<string | null>(null);
  const [emailSentToast, setEmailSentToast] = useState(false);
  const [isCashFlowOpen, setIsCashFlowOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Carrega ou cria sessão de noiva
      let profile = BrideMarketplaceService.getLocalBrideSession();
      if (!profile) {
        // Redireciona para login da noiva se não existir
        navigate('/beta/noiva/login');
        return;
      }
      setBrideProfile(profile);

      // Carrega plano de ação da noiva se já configurado
      try {
        const savedPlan = localStorage.getItem('priceus_bride_action_plan');
        if (savedPlan) {
          const parsed: WeddingActionPlan = JSON.parse(savedPlan);
          setActionPlan(parsed);

          // Se houver fornecedores externos já cadastrados no plano, sincroniza no resumo de investimentos
          if (parsed.externalVendors && parsed.externalVendors.length > 0) {
            const extQuotes: VendorQuoteSummary[] = parsed.externalVendors.map((e) => ({
              vendorId: e.id,
              vendorName: e.name,
              category: e.category,
              packageName: 'Contratação Externa',
              total: e.estimatedPrice,
            }));
            setSelectedQuotes(extQuotes);
          }
        } else {
          // Se não existir plano de ação, abre o modal de questionário
          setIsActionPlanOpen(true);
        }
      } catch {}

      // 2. Carrega fornecedores reais do marketplace
      const vendorsList = await BrideMarketplaceService.getExploreVendors();
      setVendors(vendorsList);

      // Workspace inicia limpo na aba Explorar (sem dados falsos)
      setTabs([
        { id: 'explore', title: 'Explorar Fornecedores', isExplore: true },
      ]);
      setActiveTabId('explore');
    } catch (err) {
      console.error('Erro ao carregar dados do portal da noiva:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveActionPlan = async (plan: WeddingActionPlan) => {
    setActionPlan(plan);
    if (brideProfile) {
      const updated: BrideProfile = {
        ...brideProfile,
        nome_noiva: plan.brideName,
        nome_conjuge: plan.partnerName,
        data_casamento: plan.weddingDate,
        cidade: plan.eventCity || plan.currentCity,
        orcamento_planejado: plan.totalBudget,
      };
      setBrideProfile(updated);
      BrideMarketplaceService.saveLocalBrideSession(updated);
    }

    // Recarrega fornecedores do marketplace incluindo os externos cadastrados
    const updatedVendors = await BrideMarketplaceService.getExploreVendors();
    setVendors(updatedVendors);

    // Sincroniza fornecedores externos nas cotações selecionadas
    if (plan.externalVendors && plan.externalVendors.length > 0) {
      const extQuotes: VendorQuoteSummary[] = plan.externalVendors.map((e) => ({
        vendorId: e.id,
        vendorName: e.name,
        category: e.category,
        packageName: 'Contratação Externa',
        total: e.estimatedPrice,
      }));
      setSelectedQuotes(extQuotes);
    }
  };

  // Abre um fornecedor em uma nova aba (ou ativa a aba existente se já aberta)
  const handleOpenVendorTab = (vendor: VendorMarketplaceCard) => {
    const existingIndex = tabs.findIndex((t) => t.id === vendor.user_id);
    if (existingIndex >= 0) {
      setActiveTabId(vendor.user_id);
      return;
    }

    const newTab: WorkspaceTab = {
      id: vendor.user_id,
      title: vendor.business_name,
      category: vendor.category,
      vendor,
    };

    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(vendor.user_id);

    // Se ainda não estava no resumo, adiciona com valor inicial
    if (!selectedQuotes.some((q) => q.vendorId === vendor.user_id)) {
      setSelectedQuotes((prev) => [
        ...prev,
        {
          vendorId: vendor.user_id,
          vendorName: vendor.business_name,
          category: vendor.category,
          packageName: vendor.templates[0]?.name || 'Pacote Principal',
          total: vendor.starting_price,
        },
      ]);
    }
  };

  // Abre a aba comparativa da Mesa de Decisão
  const handleOpenCompare = () => {
    const existingIndex = tabs.findIndex((t) => t.id === 'compare');
    if (existingIndex >= 0) {
      setActiveTabId('compare');
      return;
    }

    const compareTab: WorkspaceTab = {
      id: 'compare',
      title: 'Mesa de Decisão',
      isCompare: true,
    };

    setTabs((prev) => [...prev, compareTab]);
    setActiveTabId('compare');
  };

  const handleCloseTab = (tabId: string) => {
    if (tabId === 'explore') return;

    setTabs((prev) => {
      const nextTabs = prev.filter((t) => t.id !== tabId);
      if (activeTabId === tabId) {
        // Volta para a aba anterior ou explore
        const fallback = nextTabs[nextTabs.length - 1] || { id: 'explore' };
        setActiveTabId(fallback.id);
      }
      return nextTabs;
    });
  };

  const handleUpdateQuoteTotal = (vendorId: string, total: number, packageName: string) => {
    setSelectedQuotes((prev) => {
      const index = prev.findIndex((q) => q.vendorId === vendorId);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = { ...updated[index], total, packageName };
        return updated;
      }
      const vendorObj = vendors.find((v) => v.user_id === vendorId);
      return [
        ...prev,
        {
          vendorId,
          vendorName: vendorObj?.business_name || 'Fornecedor',
          category: vendorObj?.category || 'Serviço',
          packageName,
          total,
        },
      ];
    });

    // Conexão Bidirecional: Sincroniza em background o lead em negociação no LeadsManager do fornecedor
    if (brideProfile) {
      BrideMarketplaceService.registerLeadInVendorDashboard({
        vendorId,
        brideProfile,
        total,
        packageName,
        actionType: 'orcamento_negociado',
        notes: `Noiva atualizou orçamento do pacote ${packageName} para R$ ${total.toLocaleString('pt-BR')}`
      });
    }
  };

  const handleSendEmailSummary = () => {
    setEmailSentToast(true);
    setTimeout(() => setEmailSentToast(false), 4000);
  };

  const handleConfirmContract = () => {
    if (!contractModalVendor) return;
    const vendorName = contractModalVendor.vendor.business_name;
    const vendorUserId = contractModalVendor.vendor.user_id;
    const agreedTotal = contractModalVendor.total;

    // Conexão Bidirecional: Registra lead fechado no painel/LeadsManager do fornecedor
    if (brideProfile) {
      BrideMarketplaceService.registerLeadInVendorDashboard({
        vendorId: vendorUserId,
        brideProfile,
        total: agreedTotal,
        packageName: 'Contrato Formalizado via Portal',
        actionType: 'contrato_solicitado',
        notes: `Noiva formalizou contratação no valor de R$ ${agreedTotal.toLocaleString('pt-BR')}`
      });
    }

    setContractModalVendor(null);
    setContractSuccessToast(`🎉 Contrato com ${vendorName} registrado com sucesso! O profissional foi notificado no seu painel PriceU$.`);
    setTimeout(() => setContractSuccessToast(null), 5000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafaf9] text-slate-800 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-stone-500 font-medium">Carregando seu Workspace de Noiva...</p>
        </div>
      </div>
    );
  }

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  return (
    <div className="min-h-screen bg-[#fafaf9] text-slate-800 flex flex-col pb-20 sm:pb-28 selection:bg-rose-500 selection:text-white">
      {/* Sistema de Abas Estilo Navegador Interno Clean */}
      <BrideWorkspaceTabs
        tabs={tabs}
        activeTabId={activeTabId}
        onSelectTab={(id) => setActiveTabId(id)}
        onCloseTab={handleCloseTab}
        onOpenExplore={() => setActiveTabId('explore')}
        onOpenCompare={handleOpenCompare}
        onOpenActionPlan={() => setIsActionPlanOpen(true)}
        brideName={brideProfile?.nome_noiva || 'Mariana Silva'}
      />

      {/* Conteúdo Dinâmico da Aba Ativa */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8 w-full flex-1">
        {activeTab.isCompare ? (
          <BrideCompareVendors
            vendors={vendors}
            brideProfile={brideProfile!}
            onOpenVendorTab={handleOpenVendorTab}
            onOpenContractModal={(vendor, total) => setContractModalVendor({ vendor, total })}
          />
        ) : activeTab.isExplore || !activeTab.vendor ? (
          <BrideExploreVendors
            vendors={vendors}
            onOpenVendorTab={handleOpenVendorTab}
            onOpenChat={(vendor) => handleOpenVendorTab(vendor)}
            onOpenActionPlan={() => setIsActionPlanOpen(true)}
            currentEventCity={actionPlan?.eventCity || brideProfile?.cidade}
          />
        ) : (
          <BrideVendorTabContent
            key={activeTab.vendor.user_id}
            vendor={activeTab.vendor}
            brideProfile={brideProfile!}
            onUpdateQuoteTotal={handleUpdateQuoteTotal}
            onOpenContractModal={(vendor, total) => setContractModalVendor({ vendor, total })}
          />
        )}
      </main>

      {/* Modal de Questionário / Plano de Ação Eficaz da Noiva */}
      <BrideActionPlanModal
        isOpen={isActionPlanOpen}
        onClose={() => setIsActionPlanOpen(false)}
        currentProfile={brideProfile}
        onSavePlan={handleSaveActionPlan}
      />

      {/* Rodapé Fixo com Rastreador de Investimento do Casamento */}
      <BrideInvestmentSummary
        plannedBudget={brideProfile?.orcamento_planejado || 60000}
        selectedQuotes={selectedQuotes}
        onOpenContractList={() => {
          if (selectedQuotes.length > 0) {
            const first = vendors.find((v) => v.user_id === selectedQuotes[0].vendorId);
            if (first) setContractModalVendor({ vendor: first, total: selectedQuotes[0].total });
          }
        }}
        onSendEmailSummary={handleSendEmailSummary}
        onOpenCashFlowSimulator={() => setIsCashFlowOpen(true)}
      />

      {/* Modal Simulador Global de Fluxo de Caixa da Noiva */}
      <BrideCashFlowSimulatorModal
        isOpen={isCashFlowOpen}
        onClose={() => setIsCashFlowOpen(false)}
        brideProfile={brideProfile || { email: '', nome_noiva: '' }}
        selectedQuotes={selectedQuotes}
      />

      {/* Toast de Notificação de Envio por E-mail Clean */}
      {emailSentToast && (
        <div className="fixed top-20 right-4 z-50 bg-white border border-stone-200/90 p-4 rounded-2xl shadow-xl flex items-start gap-3 max-w-sm animate-in slide-in-from-right duration-200">
          <Mail className="w-5 h-5 text-rose-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs">
            <p className="font-bold text-slate-900">Resumo Enviado com Sucesso!</p>
            <p className="text-stone-500 mt-0.5">
              Enviamos todos os orçamentos e propostas selecionadas para <strong>{brideProfile?.email}</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Toast de Contrato Fechado */}
      {contractSuccessToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900 border border-slate-700 p-4 px-6 rounded-2xl shadow-2xl text-xs text-white text-center font-bold animate-in fade-in duration-200">
          {contractSuccessToast}
        </div>
      )}

      {/* Modal de Confirmação de Contrato Sofisticado */}
      {contractModalVendor && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[60] flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold">
                  <FileCheck size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Finalizar Contrato com Fornecedor</h3>
                  <p className="text-xs text-stone-500">{contractModalVendor.vendor.business_name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setContractModalVendor(null)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-slate-800 hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-2">
                <div className="flex justify-between text-stone-600">
                  <span>Noiva Contratante:</span>
                  <strong className="text-slate-900">{brideProfile?.nome_noiva}</strong>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Data do Evento:</span>
                  <strong className="text-slate-900">{brideProfile?.data_casamento || 'A definir'}</strong>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Cidade:</span>
                  <strong className="text-slate-900">{brideProfile?.cidade}</strong>
                </div>
                <div className="flex justify-between text-stone-600 pt-2 border-t border-stone-200">
                  <span className="font-semibold text-slate-700">Investimento Total Acordado:</span>
                  <strong className="text-slate-900 text-base font-black">
                    R$ {contractModalVendor.total.toLocaleString('pt-BR')}
                  </strong>
                </div>
              </div>

              <div className="p-3.5 bg-rose-50/70 border border-rose-200/80 rounded-2xl text-rose-900 text-[11px] leading-relaxed flex items-start gap-2.5">
                <ShieldCheck size={18} className="text-rose-600 flex-shrink-0 mt-0.5" />
                <span>
                  Este contrato é emitido oficialmente via plataforma PriceU$, com assinatura eletrônica com validade jurídica e controle integrado de parcelas.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setContractModalVendor(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-stone-500 hover:text-slate-800 cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleConfirmContract}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-md shadow-slate-900/10 cursor-pointer"
              >
                Confirmar e Emitir Minuta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
