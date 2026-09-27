import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  LayoutDashboard, 
  FileText, 
  Building, 
  ChevronUp,
  UserCircle,
  Sun,
  FileSignature,
  Crown,
  Calendar,
  ClipboardList,
  CheckCircle2,
  Images,
  Bot,
  Sparkles,
  LayoutGrid,
  Star,
  Video,
  HelpCircle,
  X,
  SlidersHorizontal,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Check,
  Plus
} from 'lucide-react';
import { usePlanLimits } from '../hooks/usePlanLimits';
import { useSubscription } from '../hooks/useSubscription';

interface BottomNavigationProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

export interface NavItemConfig {
  id: string;
  label: string;
  icon: any;
  hasSubmenu?: boolean;
  badge?: string;
  highlight?: boolean;
  description?: string;
}

// Catálogo completo de todas as 13 ferramentas disponíveis no PriceU$
export const ALL_NAV_ITEMS: NavItemConfig[] = [
  { id: 'meu-dia', label: 'Meu Dia', icon: Sun, description: 'Rotina, tarefas e foco do dia' },
  { id: 'leads', label: 'Leads', icon: LayoutDashboard, hasSubmenu: true, description: 'CRM, orçamentos e atendimentos' },
  { id: 'entregas', label: 'Galerias', icon: Images, description: 'Entregas, clientes e aprovações' },
  { id: 'whatsapp-ia', label: 'Zap IA', icon: Bot, badge: 'Copilot', highlight: true, description: 'Atendente e vendas por WhatsApp' },
  { id: 'ai-culling', label: 'AI Culling', icon: Sparkles, badge: 'IA Pro', highlight: true, description: 'Curadoria e seleção de fotos' },
  { id: 'templates', label: 'Orçamentos', icon: FileText, description: 'Templates de orçamentos e propostas' },
  { id: 'contratos', label: 'Contratos', icon: FileSignature, description: 'Assinatura digital e minutas' },
  { id: 'empresa', label: 'Finanças', icon: Building, description: 'Fluxo de caixa, relatórios e despesas' },
  { id: 'agenda', label: 'Agenda', icon: Calendar, description: 'Eventos, ensaios e compromissos' },
  { id: 'avaliacoes', label: 'Avaliações', icon: Star, description: 'Feedbacks e depoimentos de clientes' },
  { id: 'profile', label: 'Meu Perfil', icon: UserCircle, description: 'Portfólio público e configurações' },
  { id: 'videos', label: 'Tutoriais', icon: Video, description: 'Aulas em vídeo e guias' },
  { id: 'ajuda', label: 'Suporte', icon: HelpCircle, description: 'FAQ e central de ajuda' },
];

const DEFAULT_PRIMARY_IDS_DANIEL = ['meu-dia', 'leads', 'entregas', 'whatsapp-ia'];
const DEFAULT_PRIMARY_IDS_PUBLIC = ['meu-dia', 'leads', 'entregas', 'templates'];
const STORAGE_KEY = 'priceus_mobile_bottom_nav_v1';

// Sub-itens do menu Leads
const leadsSubItems = [
  { id: 'leads-timeline', label: 'Timeline de Leads', icon: LayoutDashboard },
  { id: 'leads-workflow', label: 'Workflow', icon: ClipboardList },
  { id: 'leads-finalizados', label: 'Finalizados', icon: CheckCircle2 },
];

// Presets Prontos
const NAV_PRESETS = [
  {
    name: '🌟 Padrão PriceU$',
    desc: 'Meu Dia, Leads, Galerias, Zap IA',
    ids: ['meu-dia', 'leads', 'entregas', 'whatsapp-ia'],
  },
  {
    name: '💼 Comercial & Vendas',
    desc: 'Meu Dia, Leads, Orçamentos, Contratos',
    ids: ['meu-dia', 'leads', 'templates', 'contratos'],
  },
  {
    name: '📸 Produção & Fotos',
    desc: 'Meu Dia, Galerias, AI Culling, Agenda',
    ids: ['meu-dia', 'entregas', 'ai-culling', 'agenda'],
  },
  {
    name: '💰 Gestão Financeira',
    desc: 'Meu Dia, Finanças, Contratos, Leads',
    ids: ['meu-dia', 'empresa', 'contratos', 'leads'],
  },
];

export function BottomNavigation({ currentPage, onPageChange }: BottomNavigationProps) {
  const { user } = useAuth();
  const isDaniel = user?.email?.toLowerCase() === 'odanielfotografo@icloud.com';
  const defaultPrimaryIds = isDaniel ? DEFAULT_PRIMARY_IDS_DANIEL : DEFAULT_PRIMARY_IDS_PUBLIC;

  const availableNavItems = useMemo(() => {
    return ALL_NAV_ITEMS.filter((item) => {
      if (item.id === 'ai-culling' || item.id === 'whatsapp-ia') {
        return isDaniel;
      }
      return true;
    });
  }, [isDaniel]);

  const availablePresets = useMemo(() => {
    return NAV_PRESETS.map((preset) => {
      if (isDaniel) return preset;
      return {
        ...preset,
        desc: preset.desc
          .replace(', Zap IA', ', Orçamentos')
          .replace('Zap IA', 'Orçamentos')
          .replace('AI Culling', 'Contratos'),
        ids: preset.ids.map((id) => {
          if (id === 'whatsapp-ia') return 'templates';
          if (id === 'ai-culling') return 'contratos';
          return id;
        }),
      };
    });
  }, [isDaniel]);

  const [expandedMenu, setExpandedMenu] = useState<'leads' | 'more' | null>(null);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [primaryIds, setPrimaryIds] = useState<string[]>(defaultPrimaryIds);
  const [tempPrimaryIds, setTempPrimaryIds] = useState<string[]>(defaultPrimaryIds);

  const planLimits = usePlanLimits();
  const { isActive } = useSubscription();

  const showBanner = !isActive && !planLimits.loading && !planLimits.isPrivileged;

  // Carrega configuração personalizada do localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 3 && parsed.length <= 4) {
          const validIds = parsed.filter((id) => availableNavItems.some((item) => item.id === id));
          if (validIds.length === parsed.length) {
            setPrimaryIds(validIds);
            setTempPrimaryIds(validIds);
            return;
          }
        }
      }
    } catch {
      // Fallback para padrão
    }
    setPrimaryIds(defaultPrimaryIds);
    setTempPrimaryIds(defaultPrimaryIds);
  }, [availableNavItems, defaultPrimaryIds]);

  // Itens Principais Dinâmicos + Botão "Mais" Fixo
  const primaryNavItems: NavItemConfig[] = [
    ...primaryIds.map((id) => availableNavItems.find((item) => item.id === id) || availableNavItems[0]),
    { id: 'more', label: 'Mais', icon: LayoutGrid },
  ];

  // Itens da Folha / Sheet "Mais Ferramentas" (todas que não estão na barra principal)
  const moreSheetItems = availableNavItems.filter((item) => !primaryIds.includes(item.id));

  // Verifica se a página atual pertence ao grupo do botão "Mais"
  const isMorePageActive = moreSheetItems.some((item) => {
    if (item.id === 'empresa') {
      return currentPage === 'empresa' || currentPage.startsWith('empresa-');
    }
    return currentPage === item.id;
  });

  const isCurrentPage = (itemId: string): boolean => {
    if (itemId === 'leads') {
      return currentPage === 'leads' || currentPage.startsWith('leads-');
    }
    if (itemId === 'empresa') {
      return currentPage === 'empresa' || currentPage.startsWith('empresa-');
    }
    if (itemId === 'more') {
      return isMorePageActive;
    }
    return currentPage === itemId;
  };

  const handleItemClick = (itemId: string) => {
    if (itemId === 'leads') {
      setExpandedMenu((prev) => (prev === 'leads' ? null : 'leads'));
      return;
    }

    if (itemId === 'more') {
      setExpandedMenu((prev) => (prev === 'more' ? null : 'more'));
      return;
    }

    if (itemId === 'leads-timeline') {
      onPageChange('leads');
      setExpandedMenu(null);
      window.history.pushState(null, '', '/dashboard/leads?tab=leads');
      window.dispatchEvent(new PopStateEvent('popstate'));
      return;
    }

    if (itemId === 'leads-workflow') {
      onPageChange('leads');
      setExpandedMenu(null);
      window.history.pushState(null, '', '/dashboard/leads?tab=producao');
      window.dispatchEvent(new PopStateEvent('popstate'));
      return;
    }

    if (itemId === 'leads-finalizados') {
      onPageChange('leads');
      setExpandedMenu(null);
      window.history.pushState(null, '', '/dashboard/leads?tab=finalizados');
      window.dispatchEvent(new PopStateEvent('popstate'));
      return;
    }

    // Navegação normal
    onPageChange(itemId);
    setExpandedMenu(null);
  };

  // Funções do Modal de Customização
  const openCustomizer = () => {
    setTempPrimaryIds([...primaryIds]);
    setIsCustomizing(true);
    setExpandedMenu(null);
  };

  const moveSlot = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= tempPrimaryIds.length) return;
    const newIds = [...tempPrimaryIds];
    const temp = newIds[index];
    newIds[index] = newIds[targetIndex];
    newIds[targetIndex] = temp;
    setTempPrimaryIds(newIds);
  };

  const toggleItemPin = (id: string) => {
    if (tempPrimaryIds.includes(id)) {
      if (tempPrimaryIds.length <= 3) {
        alert('Mantenha pelo menos 3 menus favoritos na sua barra.');
        return;
      }
      setTempPrimaryIds(tempPrimaryIds.filter((item) => item !== id));
    } else {
      if (tempPrimaryIds.length >= 4) {
        // Substitui o último item
        const newIds = [...tempPrimaryIds.slice(0, 3), id];
        setTempPrimaryIds(newIds);
      } else {
        setTempPrimaryIds([...tempPrimaryIds, id]);
      }
    }
  };

  const saveCustomization = () => {
    setPrimaryIds(tempPrimaryIds);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tempPrimaryIds));
    setIsCustomizing(false);
  };

  const resetToDefault = () => {
    setTempPrimaryIds(DEFAULT_PRIMARY_IDS);
    setPrimaryIds(DEFAULT_PRIMARY_IDS);
    localStorage.removeItem(STORAGE_KEY);
    setIsCustomizing(false);
  };

  return (
    <>
      {/* Backdrop para fechar submenus ao tocar fora */}
      {(expandedMenu || isCustomizing) && (
        <div
          onClick={() => {
            setExpandedMenu(null);
            if (!isCustomizing) setIsCustomizing(false);
          }}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
        />
      )}

      {/* Menu Inferior Fixo com design Liquid Glass Flutuante */}
      <nav className="fixed bottom-3 left-3 right-3 bg-[#032416]/95 border border-emerald-500/30 shadow-[0_12px_40px_rgba(0,0,0,0.7)] z-50 rounded-2xl safe-area-pb backdrop-blur-xl">
        <div className="flex justify-around items-center h-16 px-1">
          {primaryNavItems.map((item) => {
            const isActive = isCurrentPage(item.id);
            const isExpanded = expandedMenu === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleItemClick(item.id)}
                className={`flex flex-col items-center justify-center flex-1 h-full py-1.5 transition-all relative select-none ${
                  isActive 
                    ? 'text-emerald-400 font-bold' 
                    : 'text-emerald-100/70 hover:text-emerald-100'
                }`}
              >
                <div className="relative">
                  <item.icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px] drop-shadow-[0_0_8px_rgba(16,185,129,0.7)] scale-110' : ''} transition-transform`} />
                  {item.hasSubmenu && (
                    <ChevronUp 
                      className={`absolute -top-3 -right-2 w-3 h-3 transition-transform ${
                        isExpanded ? 'rotate-0' : 'rotate-180'
                      }`} 
                    />
                  )}
                  {item.id === 'entregas' && (
                    <span className="absolute -top-1.5 -right-2.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#34d399]" />
                  )}
                </div>
                <span className="text-[10px] mt-1 font-medium truncate max-w-[52px] leading-tight tracking-tight text-center">
                  {item.label}
                </span>
                {isActive && (
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-emerald-400 rounded-full shadow-[0_0_8px_#34d399]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Submenu Leads Expandido */}
        {expandedMenu === 'leads' && (
          <div className="absolute left-0 right-0 bottom-20 bg-[#022215]/98 backdrop-blur-2xl rounded-2xl border border-emerald-500/30 overflow-hidden shadow-2xl z-50 animate-in slide-in-from-bottom-3 duration-200">
            <div className="p-2 space-y-1">
              <div className="px-3 py-1.5 text-[10px] font-bold text-emerald-400/80 uppercase tracking-wider flex items-center justify-between border-b border-emerald-500/20">
                <span>Leads & Atendimentos</span>
                <button
                  type="button"
                  onClick={() => setExpandedMenu(null)}
                  className="p-1 rounded-md text-emerald-400/60 hover:text-emerald-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              {leadsSubItems.map((subItem) => {
                const params = new URLSearchParams(window.location.search);
                const currentTab = params.get('tab') || 'leads';
                const isSubItemActive = currentPage === 'leads' && (
                  (subItem.id === 'leads-timeline' && currentTab === 'leads') ||
                  (subItem.id === 'leads-workflow' && currentTab === 'producao') ||
                  (subItem.id === 'leads-finalizados' && currentTab === 'finalizados')
                );
                return (
                  <button
                    key={subItem.id}
                    type="button"
                    onClick={() => handleItemClick(subItem.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-colors text-xs ${
                      isSubItemActive
                        ? 'bg-emerald-500/25 text-emerald-200 font-bold border border-emerald-500/30'
                        : 'text-emerald-100/80 hover:text-emerald-100 hover:bg-emerald-500/10'
                    }`}
                  >
                    <subItem.icon className="w-4 h-4 text-emerald-400" />
                    <span>{subItem.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Bottom Sheet Completo do Botão "Mais" */}
        {expandedMenu === 'more' && (
          <div className="absolute left-0 right-0 bottom-20 bg-[#022215]/98 backdrop-blur-2xl rounded-3xl border border-emerald-500/30 overflow-hidden shadow-2xl z-50 p-4 space-y-3 animate-in slide-in-from-bottom-4 duration-200 max-h-[82vh] overflow-y-auto">
            {/* Header do Sheet */}
            <div className="flex items-center justify-between pb-2.5 border-b border-emerald-500/20">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <LayoutGrid className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Todas as Ferramentas</h4>
                  <p className="text-[10px] text-emerald-200/60">Acesso rápido e organização da barra</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Botão de Organizar Barra */}
                <button
                  type="button"
                  onClick={openCustomizer}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[11px] font-bold border border-emerald-500/30 transition-colors"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Organizar Barra</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExpandedMenu(null)}
                  className="p-1.5 rounded-full text-emerald-300/60 hover:text-emerald-100 hover:bg-emerald-500/20 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Grid 2 Colunas com as demais ferramentas */}
            <div className="grid grid-cols-2 gap-2">
              {moreSheetItems.map((item) => {
                const isActive = item.id === 'empresa'
                  ? (currentPage === 'empresa' || currentPage.startsWith('empresa-'))
                  : currentPage === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleItemClick(item.id)}
                    className={`p-3 rounded-2xl border text-left transition flex items-center gap-2.5 relative group ${
                      isActive
                        ? 'bg-emerald-500/30 border-emerald-400 text-white shadow-lg shadow-emerald-950/50'
                        : item.highlight
                          ? 'bg-gradient-to-br from-purple-950/50 to-emerald-950/50 border-purple-500/40 text-emerald-100 hover:border-purple-400'
                          : 'bg-emerald-950/40 border-emerald-500/15 text-emerald-100/80 hover:bg-emerald-900/40 hover:text-white'
                    }`}
                  >
                    <div className={`p-2 rounded-xl shrink-0 ${
                      isActive
                        ? 'bg-emerald-400 text-slate-950 font-bold'
                        : item.highlight
                          ? 'bg-purple-600/30 text-purple-300 border border-purple-500/30'
                          : 'bg-emerald-500/15 text-emerald-300'
                    }`}>
                      <item.icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold truncate block">{item.label}</span>
                        {item.badge && (
                          <span className="px-1.5 py-0.2 rounded-full bg-purple-500/30 text-purple-300 text-[8px] font-black border border-purple-400/30">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* 🎛️ MODAL / SHEET DE PERSONALIZAÇÃO DA BARRA INFERIOR MOBILE */}
      {isCustomizing && (
        <div className="fixed inset-x-3 bottom-4 top-12 z-50 bg-[#021b11]/98 border border-emerald-500/40 rounded-3xl shadow-2xl p-4 sm:p-6 backdrop-blur-2xl flex flex-col max-w-lg mx-auto animate-in slide-in-from-bottom-5 duration-300">
          {/* Header do Customizador */}
          <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Personalizar Menus do Celular</h3>
                <p className="text-xs text-emerald-200/60">Escolha e ordene os 4 atalhos favoritos da sua barra</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsCustomizing(false)}
              className="p-1.5 rounded-full text-emerald-300/70 hover:text-white hover:bg-emerald-500/20"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Conteúdo com Scroll */}
          <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-1">
            {/* Presets Rápidos */}
            <div>
              <label className="text-[11px] font-bold text-emerald-400/80 uppercase tracking-wider block mb-2">
                ⚡ Perfis Prontos (1 Toque)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {availablePresets.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => setTempPrimaryIds([...preset.ids])}
                    className="p-2.5 rounded-xl border border-emerald-500/20 bg-emerald-950/30 text-left hover:border-emerald-400 hover:bg-emerald-900/30 transition-all text-xs"
                  >
                    <div className="font-bold text-white text-[11px]">{preset.name}</div>
                    <div className="text-[9px] text-emerald-300/60 truncate mt-0.5">{preset.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Slots Atuais na Barra (4 Atalhos) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-bold text-emerald-400/80 uppercase tracking-wider">
                  📌 Seus 4 Menus Fixos na Barra
                </label>
                <span className="text-[10px] text-emerald-300/60">Use ⬆️ ⬇️ para reordenar</span>
              </div>

              <div className="space-y-2">
                {tempPrimaryIds.map((id, index) => {
                  const item = availableNavItems.find((i) => i.id === id) || availableNavItems[0];
                  if (!item) return null;
                  return (
                    <div
                      key={id}
                      className="flex items-center justify-between p-3 rounded-2xl bg-emerald-900/40 border border-emerald-500/30 shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-5 h-5 rounded-full bg-emerald-500/30 text-emerald-300 text-[10px] font-bold flex items-center justify-center border border-emerald-400/30">
                          {index + 1}
                        </span>
                        <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/20">
                          <item.icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-white text-xs">{item.label}</div>
                          <div className="text-[10px] text-emerald-200/60">{item.description}</div>
                        </div>
                      </div>

                      {/* Controles de Ordem */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveSlot(index, 'up')}
                          disabled={index === 0}
                          className="p-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/20 text-emerald-300 disabled:opacity-30 hover:bg-emerald-500/20 transition"
                          title="Mover para esquerda"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveSlot(index, 'down')}
                          disabled={index === tempPrimaryIds.length - 1}
                          className="p-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/20 text-emerald-300 disabled:opacity-30 hover:bg-emerald-500/20 transition"
                          title="Mover para direita"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Biblioteca de Todas as Ferramentas (Clique para fixar/trocar) */}
            <div>
              <label className="text-[11px] font-bold text-emerald-400/80 uppercase tracking-wider block mb-2">
                🧰 Catálogo de Ferramentas (Toque para fixar na barra)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {availableNavItems.map((item) => {
                  const isPinned = tempPrimaryIds.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleItemPin(item.id)}
                      className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between gap-2 ${
                        isPinned
                          ? 'bg-emerald-500/25 border-emerald-400 text-white shadow-md shadow-emerald-950/40'
                          : 'bg-emerald-950/30 border-emerald-500/15 text-emerald-200/70 hover:border-emerald-500/40 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`p-1.5 rounded-lg shrink-0 ${isPinned ? 'bg-emerald-400 text-slate-950' : 'bg-emerald-500/15 text-emerald-300'}`}>
                          <item.icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-semibold truncate">{item.label}</span>
                      </div>
                      <div className="shrink-0">
                        {isPinned ? (
                          <div className="w-4 h-4 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        ) : (
                          <Plus className="w-3.5 h-3.5 text-emerald-400/40" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer com Botões de Ação */}
          <div className="pt-3 border-t border-emerald-500/20 flex items-center justify-between gap-2 shrink-0">
            <button
              type="button"
              onClick={resetToDefault}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/15 text-xs font-semibold transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restaurar Padrão</span>
            </button>

            <button
              type="button"
              onClick={saveCustomization}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-500/30 transition active:scale-95 cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Salvar e Aplicar</span>
            </button>
          </div>
        </div>
      )}

      {/* Faixa Animada (Upgrade) acima do bottom menu */}
      {showBanner && (
        <div 
          onClick={() => {
            window.location.href = '/pricing';
          }}
          className="fixed bottom-[88px] left-3 right-3 h-9 z-50 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 border border-amber-400/30 flex items-center rounded-xl shadow-lg cursor-pointer overflow-hidden select-none"
        >
          {/* Badge PRO Fixo à Esquerda */}
          <div className="bg-amber-950 text-amber-400 px-2 py-0.5 rounded text-[10px] font-extrabold ml-3 flex items-center gap-1 z-10 shadow-sm flex-shrink-0">
            <Crown className="w-3.5 h-3.5 fill-current" />
            PRO
          </div>

          {/* Container do Texto Deslizante */}
          <div className="flex-1 overflow-hidden relative flex items-center h-full">
            <div className="flex animate-marquee whitespace-nowrap">
              <span className="text-[11px] font-semibold tracking-wider text-white uppercase px-4">
                ✨ PRICEUS PRO: Libere orçamentos e leads ilimitados, assinatura digital de contratos e fluxo de caixa automático! Clique aqui e assine agora. ✨
              </span>
              <span className="text-[11px] font-semibold tracking-wider text-white uppercase px-4">
                ✨ PRICEUS PRO: Libere orçamentos e leads ilimitados, assinatura digital de contratos e fluxo de caixa automático! Clique aqui e assine agora. ✨
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Espaçamento para evitar que o conteúdo seja coberto */}
      <div className={showBanner ? "h-36" : "h-24"} />
    </>
  );
}
