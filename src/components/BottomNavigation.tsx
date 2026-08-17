import { useState, useId } from 'react';
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
  X
} from 'lucide-react';
import { usePlanLimits } from '../hooks/usePlanLimits';
import { useSubscription } from '../hooks/useSubscription';

interface BottomNavigationProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

// 5 Itens Principais da Barra Inferior Mobile
const primaryNavItems = [
  { id: 'meu-dia', label: 'Meu Dia', icon: Sun },
  { id: 'leads', label: 'Leads', icon: LayoutDashboard, hasSubmenu: true },
  { id: 'entregas', label: 'Galerias', icon: Images },
  { id: 'whatsapp-ia', label: 'Zap IA', icon: Bot },
  { id: 'more', label: 'Mais', icon: LayoutGrid },
];

// Sub-itens do menu Leads
const leadsSubItems = [
  { id: 'leads-timeline', label: 'Timeline de Leads', icon: LayoutDashboard },
  { id: 'leads-workflow', label: 'Workflow', icon: ClipboardList },
  { id: 'leads-finalizados', label: 'Finalizados', icon: CheckCircle2 },
];

// Itens da Folha / Sheet "Mais Ferramentas"
const moreSheetItems = [
  { id: 'ai-culling', label: 'AI Culling & Curadoria', icon: Sparkles, badge: 'IA Pro', highlight: true },
  { id: 'templates', label: 'Meus Templates', icon: FileText },
  { id: 'workflow', label: 'Workflow', icon: ClipboardList },
  { id: 'contratos', label: 'Contratos', icon: FileSignature },
  { id: 'empresa', label: 'Empresa & Finanças', icon: Building },
  { id: 'agenda', label: 'Agenda', icon: Calendar },
  { id: 'avaliacoes', label: 'Avaliações', icon: Star },
  { id: 'profile', label: 'Meu Perfil', icon: UserCircle },
  { id: 'videos', label: 'Vídeos & Aulas', icon: Video },
  { id: 'ajuda', label: 'Suporte & Ajuda', icon: HelpCircle },
];

export function BottomNavigation({ currentPage, onPageChange }: BottomNavigationProps) {
  const [expandedMenu, setExpandedMenu] = useState<'leads' | 'more' | null>(null);
  const planLimits = usePlanLimits();
  const { isActive } = useSubscription();

  const showBanner = !isActive && !planLimits.loading && !planLimits.isPrivileged;

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

  return (
    <>
      {/* Backdrop para fechar submenus ao tocar fora */}
      {expandedMenu && (
        <div
          onClick={() => setExpandedMenu(null)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        />
      )}

      {/* Menu Inferior Fixo com design Liquid Glass Flutuante */}
      <nav className="fixed bottom-3 left-3 right-3 bg-[#032416]/90 border border-emerald-500/30 shadow-[0_12px_40px_rgba(0,0,0,0.6)] z-50 rounded-2xl safe-area-pb backdrop-blur-xl">
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
                <span className="text-[10px] mt-1 font-medium truncate max-w-[48px] leading-tight tracking-tight">
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
          <div className="absolute left-0 right-0 bottom-20 bg-[#022215]/98 backdrop-blur-2xl rounded-3xl border border-emerald-500/30 overflow-hidden shadow-2xl z-50 p-4 space-y-3 animate-in slide-in-from-bottom-4 duration-200 max-h-[78vh] overflow-y-auto">
            {/* Header do Sheet */}
            <div className="flex items-center justify-between pb-2.5 border-b border-emerald-500/20">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <LayoutGrid className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Todas as Ferramentas</h4>
                  <p className="text-[10px] text-emerald-200/60">Acesso rápido aos recursos do PriceU$</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExpandedMenu(null)}
                className="p-1.5 rounded-full text-emerald-300/60 hover:text-emerald-100 hover:bg-emerald-500/20 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Grid 2x2 / 3 colunas de Acesso Rápido */}
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
